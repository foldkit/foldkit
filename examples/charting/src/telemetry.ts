import {
  Array,
  Clock,
  DateTime,
  Effect,
  Option,
  Order,
  Record,
  pipe,
} from 'effect'

import {
  ContributorSummary,
  DependencyEdge,
  PackageSnapshot,
  RepositorySnapshot,
  Telemetry,
  WeeklyDownloads,
  WeeklyTelemetry,
  packageSpecs,
} from './domain'
import type { PackageId, PackageSpec } from './domain'
import type {
  GitHubCommitActivityResponse,
  GitHubContributorResponse,
  GitHubIssueResponse,
  GitHubPullRequestResponse,
  GitHubReleaseResponse,
  GitHubRepositoryResponse,
  GitHubStarHistoryResponse,
  GitHubStatResult,
} from './githubApi'
import { GitHubApi } from './githubApi'
import type {
  NpmDownloadsResponse,
  NpmPackument,
  NpmVersionMetadata,
} from './npmApi'
import { NpmApi } from './npmApi'
import {
  LAST_YEAR_WEEKS,
  type WeeklyCount,
  countByWeek,
  countForWeek,
  sumByWeek,
  valueForWeek,
  weekStartForDateTime,
  weekStartsForLastYear,
} from './weeks'

// CONSTANT

const TOP_CONTRIBUTOR_COUNT = 6

export type RawPackageData = Readonly<{
  spec: PackageSpec
  downloads: NpmDownloadsResponse
  packument: NpmPackument
}>

export type RawTelemetry = Readonly<{
  fetchedAt: number
  repository: GitHubRepositoryResponse
  contributors: ReadonlyArray<GitHubContributorResponse>
  issues: ReadonlyArray<GitHubIssueResponse>
  pullRequests: ReadonlyArray<GitHubPullRequestResponse>
  releases: ReadonlyArray<GitHubReleaseResponse>
  starHistory: ReadonlyArray<GitHubStarHistoryResponse>
  commitActivity: GitHubStatResult<ReadonlyArray<GitHubCommitActivityResponse>>
  packageData: ReadonlyArray<RawPackageData>
}>

// DERIVE

const weeklyDownloads = (
  downloads: NpmDownloadsResponse,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyDownloads> => {
  const weeklySums = sumByWeek(
    downloads.downloads,
    weekStarts,
    ({ day }) => weekStartForDateTime(DateTime.makeUnsafe(day)),
    ({ downloads: dayDownloads }) => dayDownloads,
  )

  return Array.map(weekStarts, weekStart =>
    WeeklyDownloads.make({
      weekStart,
      downloads: valueForWeek(weeklySums, weekStart),
    }),
  )
}

const lastWeekDownloads = (
  downloadsByWeek: ReadonlyArray<WeeklyDownloads>,
): number =>
  pipe(
    downloadsByWeek,
    Array.last,
    Option.match({
      onNone: () => 0,
      onSome: ({ downloads }) => downloads,
    }),
  )

const recordSize = (
  record: Readonly<globalThis.Record<string, string>>,
): number => Array.length(Record.keys(record))

const dependenciesOrEmpty = (
  maybeDependencies: Option.Option<Readonly<globalThis.Record<string, string>>>,
): Readonly<globalThis.Record<string, string>> =>
  Option.getOrElse(maybeDependencies, Record.empty<string, string>)

const latestMetadata = (packument: NpmPackument): NpmVersionMetadata =>
  Option.getOrElse(
    Record.get(packument.versions, packument['dist-tags'].latest),
    () => ({
      dependencies: Option.none(),
      peerDependencies: Option.none(),
    }),
  )

export const dependencyEdgesForPackage = (
  packageId: PackageId,
  metadata: NpmVersionMetadata,
): ReadonlyArray<DependencyEdge> => {
  const dependencies = dependenciesOrEmpty(metadata.dependencies)
  const peerDependencies = dependenciesOrEmpty(metadata.peerDependencies)

  const dependencyEdges = Array.map(
    Array.filter(packageSpecs, spec =>
      Array.contains(Record.keys(dependencies), spec.npmName),
    ),
    spec =>
      DependencyEdge.make({
        source: packageId,
        target: spec.id,
        kind: 'Dependency',
      }),
  )

  const peerDependencyEdges = Array.map(
    Array.filter(packageSpecs, spec =>
      Array.contains(Record.keys(peerDependencies), spec.npmName),
    ),
    spec =>
      DependencyEdge.make({
        source: packageId,
        target: spec.id,
        kind: 'PeerDependency',
      }),
  )

  return Array.appendAll(dependencyEdges, peerDependencyEdges)
}

export const packageSnapshotFromResponses = (
  spec: PackageSpec,
  downloads: NpmDownloadsResponse,
  packument: NpmPackument,
  weekStarts: ReadonlyArray<string>,
): Readonly<{
  snapshot: PackageSnapshot
  edges: ReadonlyArray<DependencyEdge>
}> => {
  const distTags = packument['dist-tags']
  const metadata = latestMetadata(packument)
  const dependencies = dependenciesOrEmpty(metadata.dependencies)
  const peerDependencies = dependenciesOrEmpty(metadata.peerDependencies)
  const downloadsByWeek = weeklyDownloads(downloads, weekStarts)

  const publishedAt = Option.getOrElse(
    Record.get(packument.time, distTags.latest),
    () => 'unknown',
  )
  const totalDownloads = Array.reduce(
    downloads.downloads,
    0,
    (total, day) => total + day.downloads,
  )
  const dependencyCount =
    recordSize(dependencies) + recordSize(peerDependencies)

  return {
    snapshot: PackageSnapshot.make({
      id: spec.id,
      npmName: spec.npmName,
      displayName: spec.displayName,
      role: spec.role,
      latestVersion: distTags.latest,
      publishedAt,
      totalDownloads,
      lastWeekDownloads: lastWeekDownloads(downloadsByWeek),
      dependencyCount,
      downloadsByWeek,
    }),
    edges: dependencyEdgesForPackage(spec.id, metadata),
  }
}

export const weeklyStars = (
  starHistory: ReadonlyArray<GitHubStarHistoryResponse>,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> =>
  pipe(
    sumByWeek(
      Array.flatMap(starHistory, ({ week, days }) => {
        const sunday = pipe(
          DateTime.fromEpochSeconds(week),
          DateTime.nearest('week', { weekStartsOn: 0 }),
        )

        return Array.map(days, (count, dayIndex) => ({
          weekStart: weekStartForDateTime(
            DateTime.add(sunday, { days: dayIndex }),
          ),
          count,
        }))
      }),
      weekStarts,
      ({ weekStart }) => weekStart,
      ({ count }) => count,
    ),
    Array.map(({ weekStart, amount }) => ({ weekStart, count: amount })),
  )

export const cumulativeStarsByWeek = (
  currentStars: number,
  starHistory: ReadonlyArray<GitHubStarHistoryResponse>,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> => {
  const emptyWeeks: ReadonlyArray<WeeklyCount> = []
  const startsWithZero = Array.map(weekStarts, weekStart => ({
    weekStart,
    count: 0,
  }))
  const weekly = weeklyStars(starHistory, weekStarts)
  const fetchedStars = Array.reduce(
    weekly,
    0,
    (total, week) => total + week.count,
  )
  const initialStars = Math.max(0, currentStars - fetchedStars)

  return Array.reduce(
    startsWithZero,
    { running: initialStars, weeks: emptyWeeks },
    (state, week) => {
      const running = state.running + countForWeek(weekly, week.weekStart)
      return {
        running,
        weeks: Array.append(state.weeks, {
          weekStart: week.weekStart,
          count: running,
        }),
      }
    },
  ).weeks
}

const commitCountForWeek =
  (weekStart: string) =>
  (activity: ReadonlyArray<GitHubCommitActivityResponse>): number =>
    pipe(
      activity,
      Array.findFirst(
        item =>
          weekStartForDateTime(DateTime.fromEpochSeconds(item.week)) ===
          weekStart,
      ),
      Option.match({
        onNone: () => 0,
        onSome: ({ total }) => total,
      }),
    )

export const weeklyCommitTotals = (
  maybeCommitActivity: Option.Option<
    ReadonlyArray<GitHubCommitActivityResponse>
  >,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> =>
  Array.map(weekStarts, weekStart => ({
    weekStart,
    count: Option.match(maybeCommitActivity, {
      onNone: () => 0,
      onSome: commitCountForWeek(weekStart),
    }),
  }))

export const weeklyReleaseTotals = (
  releases: ReadonlyArray<GitHubReleaseResponse>,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> =>
  countByWeek(releases, weekStarts, release =>
    pipe(
      release.published_at,
      Option.flatMap(DateTime.make),
      Option.map(weekStartForDateTime),
    ),
  )

export const makeWeeklyTelemetry = (
  weekStarts: ReadonlyArray<string>,
  cumulativeStars: ReadonlyArray<WeeklyCount>,
  commits: ReadonlyArray<WeeklyCount>,
  releases: ReadonlyArray<WeeklyCount>,
): ReadonlyArray<WeeklyTelemetry> =>
  Array.map(weekStarts, weekStart =>
    WeeklyTelemetry.make({
      weekStart,
      cumulativeStars: countForWeek(cumulativeStars, weekStart),
      commits: countForWeek(commits, weekStart),
      releases: countForWeek(releases, weekStart),
    }),
  )

export const contributorSummary = (
  contributor: GitHubContributorResponse,
): ContributorSummary =>
  ContributorSummary.make({
    login: contributor.login,
    contributions: contributor.contributions,
    avatarUrl: contributor.avatar_url,
  })

// FETCH

export const fetchRawTelemetry = ({
  github,
  npm,
  clock,
}: Readonly<{
  github: typeof GitHubApi.Service
  npm: typeof NpmApi.Service
  clock: typeof Clock.Clock.Service
}>): Effect.Effect<RawTelemetry, Error> =>
  Effect.gen(function* () {
    const fetchedAt = DateTime.makeUnsafe(yield* clock.currentTimeMillis)

    const repository = yield* github.fetchRepository
    const yearCutoff = DateTime.subtract(fetchedAt, {
      weeks: LAST_YEAR_WEEKS,
    })
    const [contributors, issues, pullRequests, releases] = yield* Effect.all(
      [
        github.fetchContributors,
        github.fetchIssues,
        github.fetchPullRequests,
        github.fetchReleases(yearCutoff),
      ],
      { concurrency: 'unbounded' },
    )
    const starHistory = yield* github.fetchStarHistory(yearCutoff)
    const commitActivity = yield* github.fetchCommitActivity
    const packageData = yield* Effect.forEach(
      packageSpecs,
      spec =>
        npm.fetchPackage(spec).pipe(
          Effect.map(({ downloads, packument }) => ({
            spec,
            downloads,
            packument,
          })),
        ),
      { concurrency: 'unbounded' },
    )

    return {
      fetchedAt: DateTime.toEpochMillis(fetchedAt),
      repository,
      contributors,
      issues,
      pullRequests,
      releases,
      starHistory,
      commitActivity,
      packageData,
    }
  })

export const transformTelemetry = (raw: RawTelemetry): Telemetry => {
  const weekStarts = weekStartsForLastYear(DateTime.makeUnsafe(raw.fetchedAt))

  const packageResults = Array.map(
    raw.packageData,
    ({ spec, downloads, packument }) =>
      packageSnapshotFromResponses(spec, downloads, packument, weekStarts),
  )
  const packageSnapshots = Array.map(packageResults, ({ snapshot }) => snapshot)
  const dependencyEdges = Array.flatMap(packageResults, ({ edges }) => edges)

  const openIssues = Array.length(
    Array.filter(raw.issues, issue => Option.isNone(issue.pull_request)),
  )
  const sortedContributors = Array.sort(
    raw.contributors,
    pipe(
      Order.Number,
      Order.mapInput(
        (contributor: GitHubContributorResponse) => contributor.contributions,
      ),
      Order.flip,
    ),
  )
  const cumulativeStars = cumulativeStarsByWeek(
    raw.repository.stargazers_count,
    raw.starHistory,
    weekStarts,
  )
  const warnings = raw.commitActivity.warnings

  return Telemetry.make({
    fetchedAt: raw.fetchedAt,
    repository: RepositorySnapshot.make({
      stars: raw.repository.stargazers_count,
      forks: raw.repository.forks_count,
      watchers: raw.repository.watchers_count,
      openIssues,
      openPullRequests: Array.length(raw.pullRequests),
      visibleContributors: Array.length(raw.contributors),
      pushedAt: raw.repository.pushed_at,
      defaultBranch: raw.repository.default_branch,
    }),
    packages: packageSnapshots,
    weeks: makeWeeklyTelemetry(
      weekStarts,
      cumulativeStars,
      weeklyCommitTotals(raw.commitActivity.data, weekStarts),
      weeklyReleaseTotals(raw.releases, weekStarts),
    ),
    dependencyEdges,
    topContributors: pipe(
      sortedContributors,
      Array.take(TOP_CONTRIBUTOR_COUNT),
      Array.map(contributorSummary),
    ),
    warnings,
  })
}
