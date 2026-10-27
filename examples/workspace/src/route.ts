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

const pageRouteCases = {
  Issues: RouteIssueFilters.fields,
  MyIssues: RouteIssueFilters.fields,
  Project: { projectId: Schema.String, ...RouteIssueFilters.fields },
  ProjectOverview: { projectId: Schema.String },
  ProjectSettings: { projectId: Schema.String },
  Board: { projectId: Schema.String },
  People: {},
  Settings: {},
  SavedView: { viewId: Schema.String, ...RouteIssueFilters.fields },
}

const PageRoute = defineRouteUnion(pageRouteCases)

const IssueReturnTo = Schema.Struct({
  returnTo: Schema.optionalKey(PageRoute),
})

export const ApplicationRoute = defineRouteUnion({
  ...pageRouteCases,
  Issue: { issueId: Schema.String, ...IssueReturnTo.fields },
  NotFound: { path: Schema.String },
})

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
  Route.mapTo(ApplicationRoute.Issues),
)

export const projectRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  Route.query(issueFiltersFromQuery),
  Route.mapTo(ApplicationRoute.Project),
)

export const myIssuesRouter = pipe(
  literal('my-issues'),
  Route.query(issueFiltersFromQuery),
  Route.mapTo(ApplicationRoute.MyIssues),
)

export const savedViewRouter = pipe(
  literal('views'),
  slash(string('viewId')),
  Route.query(savedViewFiltersFromQuery),
  Route.mapTo(ApplicationRoute.SavedView),
)

export const peopleRouter = pipe(
  literal('people'),
  Route.mapTo(ApplicationRoute.People),
)

export const settingsRouter = pipe(
  literal('settings'),
  Route.mapTo(ApplicationRoute.Settings),
)

export const boardRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('board')),
  Route.mapTo(ApplicationRoute.Board),
)

export const projectOverviewRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('overview')),
  Route.mapTo(ApplicationRoute.ProjectOverview),
)

export const projectSettingsRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('settings')),
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
) =>
  PageRoute.match<typeof PageRoute.Type>(route, {
    Issues: () => ApplicationRoute.Issues({ filters }),
    MyIssues: () => ApplicationRoute.MyIssues({ filters }),
    Project: ({ projectId }) =>
      ApplicationRoute.Project({ projectId, filters }),
    ProjectOverview: () => route,
    ProjectSettings: () => route,
    Board: () => route,
    People: () => route,
    Settings: () => route,
    SavedView: ({ viewId }) => ApplicationRoute.SavedView({ viewId, filters }),
  })

const pageRouteToPath = PageRoute.match({
  Issues: issuesRouter,
  MyIssues: myIssuesRouter,
  Project: projectRouter,
  ProjectOverview: projectOverviewRouter,
  ProjectSettings: projectSettingsRouter,
  Board: boardRouter,
  People: peopleRouter,
  Settings: settingsRouter,
  SavedView: savedViewRouter,
})

const pageParser = Route.oneOf(
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

const pathToPageRoute = Route.parsePathWithFallback(
  pageParser,
  ApplicationRoute.NotFound,
)

const IssueReturnToFromQuery = Schema.Struct({
  returnTo: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.decodeTo(
    IssueReturnTo,
    SchemaTransformation.transform({
      decode: ({ returnTo }) => {
        if (returnTo === undefined) {
          return {}
        }

        const route = pathToPageRoute(returnTo)

        return ApplicationRoute.guards.NotFound(route)
          ? {}
          : { returnTo: route }
      },
      encode: ({ returnTo }) =>
        returnTo === undefined ? {} : { returnTo: pageRouteToPath(returnTo) },
    }),
  ),
)

export const issueRouter = pipe(
  literal('issues'),
  slash(string('issueId')),
  Route.query(IssueReturnToFromQuery),
  Route.mapTo(ApplicationRoute.Issue),
)

export const routeToPath = (route: typeof ApplicationRoute.Type) => {
  if (ApplicationRoute.guards.Issue(route)) {
    return issueRouter(route)
  }

  if (ApplicationRoute.guards.NotFound(route)) {
    return route.path
  }

  return pageRouteToPath(route)
}

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  Route.oneOf(issueRouter, pageParser),
  ApplicationRoute.NotFound,
)

export const routeForPageContent = (route: typeof ApplicationRoute.Type) =>
  ApplicationRoute.guards.Issue(route)
    ? (route.returnTo ??
      ApplicationRoute.Issues({ filters: defaultIssueFilters }))
    : route
