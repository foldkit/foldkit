import {
  Option,
  Record,
  Schema,
  SchemaTransformation,
  Tuple,
  pipe,
} from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

import { Issue } from './domain'

export const defaultIssueFilters = Issue.Filters.make({
  query: '',
  maybeStatus: Option.none(),
  sort: 'Identifier',
  groupBy: 'None',
})

const IssueFilterRouteFields = Schema.Struct({
  filters: Schema.optionalKey(Issue.Filters),
})
type IssueFilterRouteFields = typeof IssueFilterRouteFields.Type

const IssueSelectionRouteFields = Schema.Struct({
  issueId: Schema.optionalKey(Schema.String),
})
type IssueSelectionRouteFields = typeof IssueSelectionRouteFields.Type

const issueSelectionQuery = IssueSelectionRouteFields.pipe(
  Schema.encodeKeys({ issueId: 'issue' }),
)

export const ApplicationRoute = defineRouteUnion({
  Issues: {
    ...IssueFilterRouteFields.fields,
    ...IssueSelectionRouteFields.fields,
  },
  MyIssues: {
    ...IssueFilterRouteFields.fields,
    ...IssueSelectionRouteFields.fields,
  },
  Project: {
    projectId: Schema.String,
    ...IssueFilterRouteFields.fields,
    ...IssueSelectionRouteFields.fields,
  },
  ProjectOverview: {
    projectId: Schema.String,
    ...IssueSelectionRouteFields.fields,
  },
  ProjectSettings: {
    projectId: Schema.String,
    ...IssueSelectionRouteFields.fields,
  },
  Board: { projectId: Schema.String, ...IssueSelectionRouteFields.fields },
  People: IssueSelectionRouteFields.fields,
  Settings: IssueSelectionRouteFields.fields,
  SavedView: {
    viewId: Schema.String,
    ...IssueFilterRouteFields.fields,
    ...IssueSelectionRouteFields.fields,
  },
  Issue: { issueId: Schema.String },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

const pageRouteTags = Tuple.make(
  'Issues',
  'MyIssues',
  'Project',
  'ProjectOverview',
  'ProjectSettings',
  'Board',
  'People',
  'Settings',
  'SavedView',
)

export const PageRoute = ApplicationRoute.subset(pageRouteTags)
export type PageRoute = typeof PageRoute.Type

export const isPageRoute = ApplicationRoute.isAnyOf(pageRouteTags)

const FilterQueryParams = Schema.Struct({
  search: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
  sort: Schema.optional(Schema.String),
  group: Schema.optional(Schema.String),
  filters: Schema.optional(Schema.String),
})
type FilterQueryParams = typeof FilterQueryParams.Type

const decodeStatus = Schema.decodeUnknownOption(Issue.Status)
const decodeSort = Schema.decodeUnknownOption(Issue.SortBy)
const decodeGroupBy = Schema.decodeUnknownOption(Issue.GroupBy)

const hasNonDefaultFilters = (filters: Issue.Filters) =>
  filters.query !== defaultIssueFilters.query ||
  Option.isSome(filters.maybeStatus) ||
  filters.sort !== defaultIssueFilters.sort ||
  filters.groupBy !== defaultIssueFilters.groupBy

const makeIssueFiltersQuery = ({
  isDefaultFilterMarkerRequired,
}: Readonly<{ isDefaultFilterMarkerRequired: boolean }>) =>
  FilterQueryParams.pipe(
    Schema.decodeTo(
      IssueFilterRouteFields,
      SchemaTransformation.transform({
        decode: params => {
          const isFilterQueryPresent =
            params.search !== undefined ||
            params.status !== undefined ||
            params.sort !== undefined ||
            params.group !== undefined ||
            params.filters !== undefined

          if (!isFilterQueryPresent) {
            return {}
          }

          return {
            filters: Issue.Filters.make({
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
                Option.flatMap(decodeGroupBy),
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
              isDefaultFilterMarkerRequired && !hasNonDefaultFilters(filters)
                ? '1'
                : undefined,
          }
        },
      }),
    ),
  )

const issueFiltersQuery = makeIssueFiltersQuery({
  isDefaultFilterMarkerRequired: false,
})
const savedViewFiltersQuery = makeIssueFiltersQuery({
  isDefaultFilterMarkerRequired: true,
})

export const issuesRouter = pipe(
  Route.root,
  Route.query(issueFiltersQuery),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.Issues),
)

export const projectRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  Route.query(issueFiltersQuery),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.Project),
)

export const myIssuesRouter = pipe(
  literal('my-issues'),
  Route.query(issueFiltersQuery),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.MyIssues),
)

export const savedViewRouter = pipe(
  literal('views'),
  slash(string('viewId')),
  Route.query(savedViewFiltersQuery),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.SavedView),
)

export const peopleRouter = pipe(
  literal('people'),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.People),
)

export const settingsRouter = pipe(
  literal('settings'),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.Settings),
)

export const boardRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('board')),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.Board),
)

export const projectOverviewRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('overview')),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.ProjectOverview),
)

export const projectSettingsRouter = pipe(
  literal('projects'),
  slash(string('projectId')),
  slash(literal('settings')),
  Route.query(issueSelectionQuery),
  Route.mapTo(ApplicationRoute.ProjectSettings),
)

export const maybeProjectId = (route: ApplicationRoute) =>
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

export const maybeRouteFilters = (route: ApplicationRoute) =>
  ApplicationRoute.matchOrElse<Option.Option<Issue.Filters>>(
    route,
    {
      Issues: ({ filters }) => Option.fromNullishOr(filters),
      MyIssues: ({ filters }) => Option.fromNullishOr(filters),
      Project: ({ filters }) => Option.fromNullishOr(filters),
      SavedView: ({ filters }) => Option.fromNullishOr(filters),
    },
    Option.none,
  )

export const withRouteFilters = (route: PageRoute, filters: Issue.Filters) => {
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

export const maybeIssueId = (route: ApplicationRoute) =>
  ApplicationRoute.guards.NotFound(route)
    ? Option.none()
    : Option.fromNullishOr(route.issueId)

export const withIssueId = (route: PageRoute, issueId: string) => ({
  ...route,
  issueId,
})

export const withoutIssueId = (route: PageRoute) => {
  const { issueId: _issueId, ...pageRoute } = route

  return pageRoute
}

export const issueHref = (
  route: ApplicationRoute,
  filters: Issue.Filters,
  issueId: string,
) => {
  if (!isPageRoute(route)) {
    return issueRouter({ issueId })
  }

  return routeToPath(withIssueId(withRouteFilters(route, filters), issueId))
}

export const routeHrefWithIssueFilters = (
  route: ApplicationRoute,
  filters: Issue.Filters,
) =>
  isPageRoute(route)
    ? routeToPath(withRouteFilters(route, filters))
    : routeToPath(route)

export const issueHrefsById = (
  route: ApplicationRoute,
  filters: Issue.Filters,
  issues: ReadonlyArray<Issue.Issue>,
) =>
  Record.fromIterableWith(issues, issue => [
    issue.id,
    issueHref(route, filters, issue.id),
  ])
