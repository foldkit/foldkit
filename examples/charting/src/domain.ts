import { Array, Option, Schema as S, pipe } from 'effect'

// MODEL

export const ChartMode = S.Literals(['Adoption', 'Velocity', 'Ecosystem'])
export type ChartMode = typeof ChartMode.Type
export const chartModes: ReadonlyArray<ChartMode> = ChartMode.literals

export const Period = S.Literals([
  'LastEightWeeks',
  'LastSixteenWeeks',
  'LastYear',
])
export type Period = typeof Period.Type
export const periods: ReadonlyArray<Period> = Period.literals

export const PackageId = S.Literals(['Core', 'Ui', 'Devtools', 'VitePlugin'])
export type PackageId = typeof PackageId.Type
export const packageIds: ReadonlyArray<PackageId> = PackageId.literals

export const PackageSpec = S.Struct({
  id: PackageId,
  npmName: S.String,
  displayName: S.String,
  role: S.String,
})
export type PackageSpec = typeof PackageSpec.Type

export const packageSpecs: ReadonlyArray<PackageSpec> = [
  {
    id: 'Core',
    npmName: 'foldkit',
    displayName: 'foldkit',
    role: 'runtime',
  },
  {
    id: 'Ui',
    npmName: '@foldkit/ui',
    displayName: '@foldkit/ui',
    role: 'components',
  },
  {
    id: 'Devtools',
    npmName: '@foldkit/devtools',
    displayName: '@foldkit/devtools',
    role: 'inspection',
  },
  {
    id: 'VitePlugin',
    npmName: '@foldkit/vite-plugin',
    displayName: '@foldkit/vite-plugin',
    role: 'build',
  },
]

export const WeeklyTelemetry = S.Struct({
  weekStart: S.String,
  cumulativeStars: S.Number,
  commits: S.Number,
  releases: S.Number,
})
export type WeeklyTelemetry = typeof WeeklyTelemetry.Type

export const WeeklyDownloads = S.Struct({
  weekStart: S.String,
  downloads: S.Number,
})
export type WeeklyDownloads = typeof WeeklyDownloads.Type

export const PackageSnapshot = S.Struct({
  id: PackageId,
  npmName: S.String,
  displayName: S.String,
  role: S.String,
  latestVersion: S.String,
  publishedAt: S.String,
  totalDownloads: S.Number,
  lastWeekDownloads: S.Number,
  dependencyCount: S.Number,
  downloadsByWeek: S.Array(WeeklyDownloads),
})
export type PackageSnapshot = typeof PackageSnapshot.Type

export const DependencyEdge = S.Struct({
  source: PackageId,
  target: PackageId,
  kind: S.Literals(['Dependency', 'PeerDependency']),
})
export type DependencyEdge = typeof DependencyEdge.Type

export const ContributorSummary = S.Struct({
  login: S.String,
  contributions: S.Number,
  avatarUrl: S.Option(S.String),
})
export type ContributorSummary = typeof ContributorSummary.Type

export const RepositorySnapshot = S.Struct({
  stars: S.Number,
  forks: S.Number,
  watchers: S.Number,
  openIssues: S.Number,
  openPullRequests: S.Number,
  visibleContributors: S.Number,
  pushedAt: S.String,
  defaultBranch: S.String,
})
export type RepositorySnapshot = typeof RepositorySnapshot.Type

export const Telemetry = S.Struct({
  fetchedAt: S.Number,
  repository: RepositorySnapshot,
  packages: S.Array(PackageSnapshot),
  weeks: S.Array(WeeklyTelemetry),
  dependencyEdges: S.Array(DependencyEdge),
  topContributors: S.Array(ContributorSummary),
  warnings: S.Array(S.String),
})
export type Telemetry = typeof Telemetry.Type

// CONSTANT

const LAST_EIGHT_WEEKS = 8
const LAST_SIXTEEN_WEEKS = 16
const LAST_YEAR_WEEKS = 52

// QUERY

const weekCountByPeriod: Record<Period, number> = {
  LastEightWeeks: LAST_EIGHT_WEEKS,
  LastSixteenWeeks: LAST_SIXTEEN_WEEKS,
  LastYear: LAST_YEAR_WEEKS,
}

const weekCountForPeriod = (period: Period): number => weekCountByPeriod[period]

export const periodLabels: Record<Period, string> = {
  LastEightWeeks: '8 weeks',
  LastSixteenWeeks: '16 weeks',
  LastYear: '1 year',
}

export const packageIdToSpec = (packageId: PackageId): PackageSpec =>
  pipe(
    packageSpecs,
    Array.findFirst(({ id }) => id === packageId),
    Option.getOrElse(() => ({
      id: 'Core' as const,
      npmName: 'foldkit',
      displayName: 'foldkit',
      role: 'runtime',
    })),
  )

export const visibleWeeks = (
  telemetry: Telemetry,
  period: Period,
): ReadonlyArray<WeeklyTelemetry> =>
  Array.takeRight(telemetry.weeks, weekCountForPeriod(period))

export const totalDownloads = (telemetry: Telemetry): number =>
  Array.reduce(
    telemetry.packages,
    0,
    (total, snapshot) => total + snapshot.totalDownloads,
  )

export const totalCommits = (telemetry: Telemetry): number =>
  Array.reduce(telemetry.weeks, 0, (total, week) => total + week.commits)

export const findPackageSnapshot = (
  telemetry: Telemetry,
  packageId: PackageId,
): Option.Option<PackageSnapshot> =>
  Array.findFirst(telemetry.packages, snapshot => snapshot.id === packageId)
