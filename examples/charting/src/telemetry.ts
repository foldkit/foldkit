import {
  Array,
  Clock,
  Effect,
  Option,
  Order,
  Record as Record_,
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
  GitHubStargazerResponse,
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
  type WeeklyCount,
  countByWeek,
  countForWeek,
  dateStringToMilliseconds,
  sumByWeek,
  valueForWeek,
  weekStartForMilliseconds,
  weekStartsForLastYear,
} from './weeks'

// CONSTANT

const MILLISECONDS_PER_SECOND = 1_000
const MILLISECONDS_PER_WEEK = 7 * 24 * 60 * 60 * MILLISECONDS_PER_SECOND
const LAST_YEAR_MILLISECONDS = 52 * MILLISECONDS_PER_WEEK
const TOP_CONTRIBUTOR_COUNT = 6

// MODEL

export type RawPackageData = Readonly<{
  spec: PackageSpec
  downloads: typeof NpmDownloadsResponse.Type
  packument: typeof NpmPackument.Type
}>

export type RawTelemetry = Readonly<{
  fetchedAt: number
  repository: typeof GitHubRepositoryResponse.Type
  contributors: ReadonlyArray<typeof GitHubContributorResponse.Type>
  issues: ReadonlyArray<typeof GitHubIssueResponse.Type>
  pullRequests: ReadonlyArray<typeof GitHubPullRequestResponse.Type>
  releases: ReadonlyArray<typeof GitHubReleaseResponse.Type>
  stargazers: ReadonlyArray<typeof GitHubStargazerResponse.Type>
  commitActivity: GitHubStatResult<
    ReadonlyArray<typeof GitHubCommitActivityResponse.Type>
  >
  packageData: ReadonlyArray<RawPackageData>
}>

// DERIVE

const weeklyDownloads = (
  downloads: typeof NpmDownloadsResponse.Type,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<typeof WeeklyDownloads.Type> => {
  const weeklySums = sumByWeek(
    downloads.downloads,
    weekStarts,
    ({ day }) => weekStartForMilliseconds(dateStringToMilliseconds(day)),
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
  downloadsByWeek: ReadonlyArray<typeof WeeklyDownloads.Type>,
): number =>
  pipe(
    downloadsByWeek,
    Array.last,
    Option.match({
      onNone: () => 0,
      onSome: ({ downloads }) => downloads,
    }),
  )

const recordSize = (record: Readonly<Record<string, string>>): number =>
  Array.length(Record_.keys(record))

const dependenciesOrEmpty = (
  maybeDependencies: Option.Option<Readonly<Record<string, string>>>,
): Readonly<Record<string, string>> =>
  Option.getOrElse(maybeDependencies, Record_.empty<string, string>)

const latestMetadata = (
  packument: typeof NpmPackument.Type,
): NpmVersionMetadata =>
  Option.getOrElse(
    Record_.get(packument.versions, packument['dist-tags'].latest),
    () => ({
      dependencies: Option.none(),
      peerDependencies: Option.none(),
    }),
  )

export const dependencyEdgesForPackage = (
  packageId: PackageId,
  metadata: NpmVersionMetadata,
): ReadonlyArray<typeof DependencyEdge.Type> => {
  const dependencies = dependenciesOrEmpty(metadata.dependencies)
  const peerDependencies = dependenciesOrEmpty(metadata.peerDependencies)

  const dependencyEdges = Array.map(
    Array.filter(packageSpecs, spec =>
      Array.contains(Record_.keys(dependencies), spec.npmName),
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
      Array.contains(Record_.keys(peerDependencies), spec.npmName),
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
  downloads: typeof NpmDownloadsResponse.Type,
  packument: typeof NpmPackument.Type,
  weekStarts: ReadonlyArray<string>,
): Readonly<{
  snapshot: typeof PackageSnapshot.Type
  edges: ReadonlyArray<typeof DependencyEdge.Type>
}> => {
  const distTags = packument['dist-tags']
  const metadata = latestMetadata(packument)
  const dependencies = dependenciesOrEmpty(metadata.dependencies)
  const peerDependencies = dependenciesOrEmpty(metadata.peerDependencies)
  const downloadsByWeek = weeklyDownloads(downloads, weekStarts)

  const publishedAt = Option.getOrElse(
    Record_.get(packument.time, distTags.latest),
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
  stargazers: ReadonlyArray<typeof GitHubStargazerResponse.Type>,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> =>
  countByWeek(stargazers, weekStarts, ({ starred_at }) =>
    pipe(
      Date.parse(starred_at),
      Option.liftPredicate(Number.isFinite),
      Option.map(weekStartForMilliseconds),
    ),
  )

export const cumulativeStarsByWeek = (
  currentStars: number,
  stargazers: ReadonlyArray<typeof GitHubStargazerResponse.Type>,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> => {
  const emptyWeeks: ReadonlyArray<WeeklyCount> = []
  const startsWithZero = Array.map(weekStarts, weekStart => ({
    weekStart,
    count: 0,
  }))
  const weekly = weeklyStars(stargazers, weekStarts)
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
  (activity: ReadonlyArray<typeof GitHubCommitActivityResponse.Type>): number =>
    pipe(
      activity,
      Array.findFirst(
        item =>
          weekStartForMilliseconds(item.week * MILLISECONDS_PER_SECOND) ===
          weekStart,
      ),
      Option.match({
        onNone: () => 0,
        onSome: ({ total }) => total,
      }),
    )

export const weeklyCommitTotals = (
  maybeCommitActivity: Option.Option<
    ReadonlyArray<typeof GitHubCommitActivityResponse.Type>
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
  releases: ReadonlyArray<typeof GitHubReleaseResponse.Type>,
  weekStarts: ReadonlyArray<string>,
): ReadonlyArray<WeeklyCount> =>
  countByWeek(
    Array.filter(releases, release => Option.isSome(release.published_at)),
    weekStarts,
    release =>
      Option.map(release.published_at, publishedAt =>
        weekStartForMilliseconds(Date.parse(publishedAt)),
      ),
  )

export const makeWeeklyTelemetry = (
  weekStarts: ReadonlyArray<string>,
  cumulativeStars: ReadonlyArray<WeeklyCount>,
  commits: ReadonlyArray<WeeklyCount>,
  releases: ReadonlyArray<WeeklyCount>,
): ReadonlyArray<typeof WeeklyTelemetry.Type> =>
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
): typeof ContributorSummary.Type =>
  ContributorSummary.make({
    login: contributor.login,
    contributions: contributor.contributions,
    avatarUrl: contributor.avatar_url,
  })

// FETCH

export const fetchRawTelemetry: Effect.Effect<
  RawTelemetry,
  Error,
  GitHubApi | NpmApi
> = Effect.gen(function* () {
  const github = yield* GitHubApi
  const npm = yield* NpmApi
  const fetchedAt = yield* Clock.currentTimeMillis

  const repository = yield* github.fetchRepository
  const yearCutoff = fetchedAt - LAST_YEAR_MILLISECONDS
  const [contributors, issues, pullRequests, releases] = yield* Effect.all(
    [
      github.fetchContributors,
      github.fetchIssues,
      github.fetchPullRequests,
      github.fetchReleases(yearCutoff),
    ],
    { concurrency: 'unbounded' },
  )
  const stargazers = yield* github.fetchStargazers(repository.stargazers_count)
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
    fetchedAt,
    repository,
    contributors,
    issues,
    pullRequests,
    releases,
    stargazers,
    commitActivity,
    packageData,
  }
})

export const transformTelemetry = (
  raw: RawTelemetry,
): typeof Telemetry.Type => {
  const weekStarts = weekStartsForLastYear(raw.fetchedAt)

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
    raw.stargazers,
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
