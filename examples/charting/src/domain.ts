import { Array, Option, Schema, pipe } from 'effect'

// MODEL

export const ChartMode = Schema.Literals(['Adoption', 'Velocity', 'Ecosystem'])
export type ChartMode = typeof ChartMode.Type
export const chartModes: ReadonlyArray<ChartMode> = ChartMode.literals

export const Period = Schema.Literals([
  'LastEightWeeks',
  'LastSixteenWeeks',
  'LastYear',
])
export type Period = typeof Period.Type
export const periods: ReadonlyArray<Period> = Period.literals

export const PackageId = Schema.Literals([
  'Core',
  'Ui',
  'Devtools',
  'VitePlugin',
])
export type PackageId = typeof PackageId.Type
export const packageIds: ReadonlyArray<PackageId> = PackageId.literals

export const PackageSpec = Schema.Struct({
  id: PackageId,
  npmName: Schema.String,
  displayName: Schema.String,
  role: Schema.String,
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

export const WeeklyTelemetry = Schema.Struct({
  weekStart: Schema.String,
  cumulativeStars: Schema.Number,
  commits: Schema.Number,
  releases: Schema.Number,
})
export type WeeklyTelemetry = typeof WeeklyTelemetry.Type

export const WeeklyDownloads = Schema.Struct({
  weekStart: Schema.String,
  downloads: Schema.Number,
})
export type WeeklyDownloads = typeof WeeklyDownloads.Type

export const PackageSnapshot = Schema.Struct({
  id: PackageId,
  npmName: Schema.String,
  displayName: Schema.String,
  role: Schema.String,
  latestVersion: Schema.String,
  publishedAt: Schema.String,
  totalDownloads: Schema.Number,
  lastWeekDownloads: Schema.Number,
  dependencyCount: Schema.Number,
  downloadsByWeek: Schema.Array(WeeklyDownloads),
})
export type PackageSnapshot = typeof PackageSnapshot.Type

export const DependencyEdge = Schema.Struct({
  source: PackageId,
  target: PackageId,
  kind: Schema.Literals(['Dependency', 'PeerDependency']),
})
export type DependencyEdge = typeof DependencyEdge.Type

export const ContributorSummary = Schema.Struct({
  login: Schema.String,
  contributions: Schema.Number,
  avatarUrl: Schema.Option(Schema.String),
})
export type ContributorSummary = typeof ContributorSummary.Type

export const RepositorySnapshot = Schema.Struct({
  stars: Schema.Number,
  forks: Schema.Number,
  watchers: Schema.Number,
  openIssues: Schema.Number,
  openPullRequests: Schema.Number,
  visibleContributors: Schema.Number,
  pushedAt: Schema.String,
  defaultBranch: Schema.String,
})
export type RepositorySnapshot = typeof RepositorySnapshot.Type

export const Telemetry = Schema.Struct({
  fetchedAt: Schema.Number,
  repository: RepositorySnapshot,
  packages: Schema.Array(PackageSnapshot),
  weeks: Schema.Array(WeeklyTelemetry),
  dependencyEdges: Schema.Array(DependencyEdge),
  topContributors: Schema.Array(ContributorSummary),
  warnings: Schema.Array(Schema.String),
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
