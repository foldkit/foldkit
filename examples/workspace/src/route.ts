import { Option, Predicate, Schema, SchemaTransformation, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'
import * as Url from 'foldkit/url'

import { GroupBy, IssueFilters, IssueStatus } from './domain'

export const defaultIssueFilters: typeof IssueFilters.Type = IssueFilters.make({
  query: '',
  maybeStatus: Option.none(),
  sort: 'Identifier',
  groupBy: 'None',
})

const RouteIssueFilters = Schema.Struct({
  filters: Schema.optionalKey(IssueFilters),
})

const IssueReturnTo = Schema.Struct({
  returnTo: Schema.optionalKey(Schema.String),
})

export const ApplicationRoute = defineRouteUnion({
  Issues: RouteIssueFilters.fields,
  MyIssues: RouteIssueFilters.fields,
  Project: { projectId: Schema.String, ...RouteIssueFilters.fields },
  ProjectOverview: { projectId: Schema.String },
  ProjectSettings: { projectId: Schema.String },
  Board: { projectId: Schema.String },
  People: {},
  Settings: {},
  SavedView: { viewId: Schema.String, ...RouteIssueFilters.fields },
  Issue: { issueId: Schema.String, ...IssueReturnTo.fields },
  NotFound: { path: Schema.String },
})

export const IssueCloseRoute = ApplicationRoute.subset([
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

const FilterQueryParams = Schema.Struct({
  search: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
  sort: Schema.optionalKey(Schema.String),
  group: Schema.optionalKey(Schema.String),
  filters: Schema.optionalKey(Schema.String),
})

const decodeStatus = Schema.decodeUnknownOption(IssueStatus)
const decodeSort = Schema.decodeUnknownOption(IssueFilters.fields.sort)
const decodeGroup = Schema.decodeUnknownOption(GroupBy)

const hasNonDefaultFilters = (filters: typeof IssueFilters.Type) =>
  filters.query !== defaultIssueFilters.query ||
  Option.isSome(filters.maybeStatus) ||
  filters.sort !== defaultIssueFilters.sort ||
  filters.groupBy !== defaultIssueFilters.groupBy

const filtersFromQuery = (hasDefaultPresenceMarker: boolean) =>
  FilterQueryParams.pipe(
    Schema.decodeTo(
      RouteIssueFilters,
      SchemaTransformation.transform({
        decode: params => {
          const hasFilters =
            Predicate.isNotUndefined(params.search) ||
            Predicate.isNotUndefined(params.status) ||
            Predicate.isNotUndefined(params.sort) ||
            Predicate.isNotUndefined(params.group) ||
            Predicate.isNotUndefined(params.filters)

          if (!hasFilters) {
            return {}
          }

          return {
            filters: IssueFilters.make({
              query: params.search ?? defaultIssueFilters.query,
              maybeStatus: Option.flatMap(
                Option.fromNullishOr(params.status),
                decodeStatus,
              ),
              sort: Option.getOrElse(
                Option.flatMap(Option.fromNullishOr(params.sort), decodeSort),
                () => defaultIssueFilters.sort,
              ),
              groupBy: Option.getOrElse(
                Option.flatMap(Option.fromNullishOr(params.group), decodeGroup),
                () => defaultIssueFilters.groupBy,
              ),
            }),
          }
        },
        encode: ({ filters }) => {
          if (Predicate.isUndefined(filters)) {
            return {}
          }

          const hasNonDefaults = hasNonDefaultFilters(filters)

          return {
            ...(filters.query === defaultIssueFilters.query
              ? {}
              : { search: filters.query }),
            ...Option.match(filters.maybeStatus, {
              onNone: () => ({}),
              onSome: status => ({ status }),
            }),
            ...(filters.sort === defaultIssueFilters.sort
              ? {}
              : { sort: filters.sort }),
            ...(filters.groupBy === defaultIssueFilters.groupBy
              ? {}
              : { group: filters.groupBy }),
            ...(hasDefaultPresenceMarker && !hasNonDefaults
              ? { filters: '1' }
              : {}),
          }
        },
      }),
    ),
  )

const issueFiltersFromQuery = filtersFromQuery(false)
const savedViewFiltersFromQuery = filtersFromQuery(true)

const canonicalIssueReturnTo = (returnTo: string): Option.Option<string> =>
  Option.map(parseIssueCloseRoute(returnTo), routeToPath)

const issueReturnToFromQuery = Schema.Struct({
  returnTo: Schema.OptionFromOptional(Schema.String),
}).pipe(
  Schema.decodeTo(
    IssueReturnTo,
    SchemaTransformation.transform({
      decode: ({ returnTo }) =>
        Option.match(Option.flatMap(returnTo, canonicalIssueReturnTo), {
          onNone: () => IssueReturnTo.make({}),
          onSome: canonical => IssueReturnTo.make({ returnTo: canonical }),
        }),
      encode: ({ returnTo }) => ({
        returnTo: Option.flatMap(
          Option.fromNullishOr(returnTo),
          canonicalIssueReturnTo,
        ),
      }),
    }),
  ),
)

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

export const issueRouter = pipe(
  literal('issues'),
  slash(string('issueId')),
  Route.query(issueReturnToFromQuery),
  Route.mapTo(ApplicationRoute.Issue),
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
  route: typeof ApplicationRoute.Type,
  filters: typeof IssueFilters.Type,
) =>
  ApplicationRoute.match<typeof ApplicationRoute.Type>(route, {
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
    Issue: () => route,
    NotFound: () => route,
  })

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

const workspaceOrigin = 'https://workspace.invalid'

const parseNativeUrl = (value: string): Option.Option<URL> => {
  try {
    return Option.some(new globalThis.URL(value, workspaceOrigin))
  } catch {
    return Option.none()
  }
}

export function parseIssueCloseRoute(
  returnTo: string,
): Option.Option<typeof IssueCloseRoute.Type> {
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return Option.none()
  }

  return pipe(
    parseNativeUrl(returnTo),
    Option.filter(
      parsedUrl =>
        parsedUrl.origin === workspaceOrigin &&
        `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` ===
          returnTo &&
        !parsedUrl.pathname.startsWith('/issues/'),
    ),
    Option.flatMap(parsedUrl => Url.fromString(parsedUrl.href)),
    Option.map(urlToApplicationRoute),
    Option.flatMap(route =>
      ApplicationRoute.isAnyOf(['Issue', 'NotFound'])(route)
        ? Option.none()
        : Option.some(route),
    ),
  )
}

export const maybeIssueCloseRoute = (
  route: typeof ApplicationRoute.Issue.Type,
) => Option.flatMap(Option.fromNullishOr(route.returnTo), parseIssueCloseRoute)

export const resolveIssueCloseRoute = (
  route: typeof ApplicationRoute.Issue.Type,
): typeof IssueCloseRoute.Type =>
  Option.getOrElse(maybeIssueCloseRoute(route), () =>
    ApplicationRoute.Issues({ filters: defaultIssueFilters }),
  )
