import { Option, Schema, SchemaTransformation, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

import { GroupBy, IssueFilters, IssueStatus } from './domain'

export const defaultIssueFilters = IssueFilters.make({
  query: '',
  maybeStatus: Option.none(),
  sort: 'Identifier',
  groupBy: 'None',
})

const RouteIssueFilters = Schema.Struct({
  filters: Schema.optionalKey(IssueFilters),
})

const IssuePanel = Schema.Struct({
  issueId: Schema.optionalKey(Schema.String),
})

const issuePanelFromQuery = IssuePanel.pipe(
  Schema.encodeKeys({ issueId: 'issue' }),
)

export const ApplicationRoute = defineRouteUnion({
  Issues: { ...RouteIssueFilters.fields, ...IssuePanel.fields },
  MyIssues: { ...RouteIssueFilters.fields, ...IssuePanel.fields },
  Project: {
    projectId: Schema.String,
    ...RouteIssueFilters.fields,
    ...IssuePanel.fields,
  },
  ProjectOverview: { projectId: Schema.String, ...IssuePanel.fields },
  ProjectSettings: { projectId: Schema.String, ...IssuePanel.fields },
  Board: { projectId: Schema.String, ...IssuePanel.fields },
  People: IssuePanel.fields,
  Settings: IssuePanel.fields,
  SavedView: {
    viewId: Schema.String,
    ...RouteIssueFilters.fields,
    ...IssuePanel.fields,
  },
  Issue: { issueId: Schema.String },
  NotFound: { path: Schema.String },
})

export const PageRoute = ApplicationRoute.subset([
  'Issues',
  'MyIssues',
  'Project',
  'ProjectOverview',
  'ProjectSettings',
  'Board',
  'People',
  'Settings',
  'SavedView',
])

export const isPageRoute = Schema.is(PageRoute)

const FilterQueryParams = Schema.Struct({
  search: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  sort: Schema.optional(Schema.String),
  group: Schema.optional(Schema.String),
  filters: Schema.optional(Schema.String),
})

const decodeStatus = Schema.decodeUnknownOption(IssueStatus)
const decodeSort = Schema.decodeUnknownOption(IssueFilters.fields.sort)
const decodeGroup = Schema.decodeUnknownOption(GroupBy)

const hasNonDefaultFilters = (filters: typeof IssueFilters.Type) =>
  filters.query !== defaultIssueFilters.query ||
  Option.isSome(filters.maybeStatus) ||
  filters.sort !== defaultIssueFilters.sort ||
  filters.groupBy !== defaultIssueFilters.groupBy

const filtersFromQuery = (isSavedView: boolean) =>
  FilterQueryParams.pipe(
    Schema.decodeTo(
      RouteIssueFilters,
      SchemaTransformation.transform({
        decode: params => {
          const hasFilters =
            params.search !== undefined ||
            params.status !== undefined ||
            params.sort !== undefined ||
            params.group !== undefined ||
            params.filters !== undefined

          if (!hasFilters) {
            return {}
          }

          return {
            filters: IssueFilters.make({
              query: params.search ?? defaultIssueFilters.query,
              maybeStatus: pipe(
                Option.fromNullishOr(params.status),
                Option.flatMap(decodeStatus),
              ),
              sort: pipe(
                Option.fromNullishOr(params.sort),
                Option.flatMap(decodeSort),
                Option.getOrElse(() => defaultIssueFilters.sort),
              ),
              groupBy: pipe(
                Option.fromNullishOr(params.group),
                Option.flatMap(decodeGroup),
                Option.getOrElse(() => defaultIssueFilters.groupBy),
              ),
            }),
          }
        },
        encode: ({ filters }) => {
          if (filters === undefined) {
            return {}
          }

          return {
            search:
              filters.query === defaultIssueFilters.query
                ? undefined
                : filters.query,
            status: Option.getOrUndefined(filters.maybeStatus),
            sort:
              filters.sort === defaultIssueFilters.sort
                ? undefined
                : filters.sort,
            group:
              filters.groupBy === defaultIssueFilters.groupBy
                ? undefined
                : filters.groupBy,
            filters:
              isSavedView && !hasNonDefaultFilters(filters) ? '1' : undefined,
          }
        },
      }),
    ),
  )

const issueFiltersFromQuery = filtersFromQuery(false)
const savedViewFiltersFromQuery = filtersFromQuery(true)

export const issuesRouter = pipe(
  Route.root,
  Route.query(issueFiltersFromQuery),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.Issues),
)

export const projectRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  Route.query(issueFiltersFromQuery),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.Project),
)

export const myIssuesRouter = pipe(
  literal('my-issues'),
  Route.query(issueFiltersFromQuery),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.MyIssues),
)

export const savedViewRouter = pipe(
  literal('views'),
  slash(string('viewId')),
  Route.query(savedViewFiltersFromQuery),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.SavedView),
)

export const peopleRouter = pipe(
  literal('people'),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.People),
)

export const settingsRouter = pipe(
  literal('settings'),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.Settings),
)

export const boardRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('board')),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.Board),
)

export const projectOverviewRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('overview')),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.ProjectOverview),
)

export const projectSettingsRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('settings')),
  Route.query(issuePanelFromQuery),
  Route.mapTo(ApplicationRoute.ProjectSettings),
)

export const maybeProjectId = (route: typeof ApplicationRoute.Type) =>
  ApplicationRoute.matchOrElse<Option.Option<string>>(
    route,
    {
      Project: ({ projectId }) => Option.some(projectId),
      Board: ({ projectId }) => Option.some(projectId),
      ProjectOverview: ({ projectId }) => Option.some(projectId),
      ProjectSettings: ({ projectId }) => Option.some(projectId),
    },
    Option.none,
  )

export const routeFilters = (route: typeof ApplicationRoute.Type) =>
  ApplicationRoute.matchOrElse<Option.Option<typeof IssueFilters.Type>>(
    route,
    {
      Issues: ({ filters }) => Option.fromNullishOr(filters),
      MyIssues: ({ filters }) => Option.fromNullishOr(filters),
      Project: ({ filters }) => Option.fromNullishOr(filters),
      SavedView: ({ filters }) => Option.fromNullishOr(filters),
    },
    Option.none,
  )

export const withRouteFilters = (
  route: typeof PageRoute.Type,
  filters: typeof IssueFilters.Type,
) => {
  if (
    ApplicationRoute.isAnyOf(['Issues', 'MyIssues', 'Project', 'SavedView'])(
      route,
    )
  ) {
    return { ...route, filters }
  }

  return route
}

export const issueRouter = pipe(
  literal('issues'),
  slash(string('issueId')),
  Route.mapTo(ApplicationRoute.Issue),
)

export const routeToPath = ApplicationRoute.match({
  Issues: issuesRouter,
  MyIssues: myIssuesRouter,
  Project: projectRouter,
  ProjectOverview: projectOverviewRouter,
  ProjectSettings: projectSettingsRouter,
  Board: boardRouter,
  People: peopleRouter,
  Settings: settingsRouter,
  SavedView: savedViewRouter,
  Issue: issueRouter,
  NotFound: ({ path }) => path,
})

const routeParser = Route.oneOf(
  issueRouter,
  boardRouter,
  projectOverviewRouter,
  projectSettingsRouter,
  projectRouter,
  myIssuesRouter,
  peopleRouter,
  settingsRouter,
  savedViewRouter,
  issuesRouter,
)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

export const maybeIssueId = (route: typeof ApplicationRoute.Type) =>
  ApplicationRoute.guards.NotFound(route)
    ? Option.none()
    : Option.fromNullishOr(route.issueId)

export const withIssuePanel = (
  route: typeof PageRoute.Type,
  issueId: string,
) => ({ ...route, issueId })

export const withoutIssuePanel = (route: typeof PageRoute.Type) => {
  const { issueId: _issueId, ...pageRoute } = route

  return pageRoute
}
