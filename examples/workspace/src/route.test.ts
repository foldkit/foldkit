import { Option, Schema } from 'effect'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { IssueFilters } from './domain'
import {
  ApplicationRoute,
  PageRoute,
  boardRouter,
  defaultIssueFilters,
  issueRouter,
  issuesRouter,
  maybeIssueId,
  maybeRouteFilters,
  myIssuesRouter,
  projectRouter,
  routeToPath,
  savedViewRouter,
  urlToApplicationRoute,
  withIssueId,
  withRouteFilters,
  withoutIssueId,
} from './route'

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const customFilters = IssueFilters.make({
  query: 'cache & routing',
  maybeStatus: Option.some('Todo'),
  sort: 'Priority',
  groupBy: 'Status',
})

describe('workspace list routes', () => {
  test('prints unfiltered routes without query parameters', () => {
    expect(issuesRouter({})).toBe('/')
    expect(myIssuesRouter({})).toBe('/my-issues')
    expect(projectRouter({ projectId: 'platform' })).toBe('/projects/platform')
    expect(savedViewRouter({ viewId: 'mine' })).toBe('/views/mine')
  })

  test('prints nondefault filters and round-trips encoded search text', () => {
    const path = issuesRouter({ filters: customFilters })

    expect(path).toBe(
      '/?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
    )

    const route = urlToApplicationRoute(url(path))

    expect(route).toEqual(ApplicationRoute.Issues({ filters: customFilters }))
    expect(maybeRouteFilters(route)).toEqual(Option.some(customFilters))
    expect(routeToPath(route)).toBe(path)
  })

  test('supports the same filters on My Issues, Project, and Saved View', () => {
    const paths = [
      myIssuesRouter({ filters: customFilters }),
      projectRouter({ projectId: 'platform', filters: customFilters }),
      savedViewRouter({ viewId: 'mine', filters: customFilters }),
    ]

    expect(paths).toEqual([
      '/my-issues?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
      '/projects/platform?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
      '/views/mine?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
    ])

    for (const path of paths) {
      expect(maybeRouteFilters(urlToApplicationRoute(url(path)))).toEqual(
        Option.some(customFilters),
      )
    }
  })

  test('omits defaults on ordinary routes and marks a Saved View default override', () => {
    expect(issuesRouter({ filters: defaultIssueFilters })).toBe('/')
    expect(
      projectRouter({ projectId: 'platform', filters: defaultIssueFilters }),
    ).toBe('/projects/platform')
    expect(
      savedViewRouter({ viewId: 'mine', filters: defaultIssueFilters }),
    ).toBe('/views/mine?filters=1')

    expect(
      maybeRouteFilters(urlToApplicationRoute(url('/views/mine'))),
    ).toEqual(Option.none())
    expect(
      maybeRouteFilters(urlToApplicationRoute(url('/views/mine?filters=1'))),
    ).toEqual(Option.some(defaultIssueFilters))
  })

  test('defaults malformed filter values without rejecting the route', () => {
    const route = urlToApplicationRoute(
      url('/?search=release%2Fnotes&status=Unknown&sort=Newest&group=Owner'),
    )

    expect(maybeRouteFilters(route)).toEqual(
      Option.some(
        IssueFilters.make({
          ...defaultIssueFilters,
          query: 'release/notes',
        }),
      ),
    )
    expect(routeToPath(route)).toBe('/?search=release%2Fnotes')
  })

  test('sets explicit filters only on supported routes', () => {
    expect(
      withRouteFilters(
        ApplicationRoute.Project({ projectId: 'platform' }),
        customFilters,
      ),
    ).toEqual(
      ApplicationRoute.Project({
        projectId: 'platform',
        filters: customFilters,
      }),
    )

    const myIssuesRoute = ApplicationRoute.MyIssues({ issueId: 'issue-101' })
    expect(withRouteFilters(myIssuesRoute, customFilters)).toEqual(
      ApplicationRoute.MyIssues({
        issueId: 'issue-101',
        filters: customFilters,
      }),
    )

    const boardRoute = ApplicationRoute.Board({ projectId: 'platform' })

    expect(withRouteFilters(boardRoute, customFilters)).toBe(boardRoute)
  })
})

describe('issue selection', () => {
  test('round-trips a filtered Project with a selected issue', () => {
    const route = ApplicationRoute.Project({
      projectId: 'platform',
      filters: customFilters,
      issueId: 'issue-101',
    })
    const path = routeToPath(route)

    expect(path).toBe(
      '/projects/platform?search=cache+%26+routing&status=Todo&sort=Priority&group=Status&issue=issue-101',
    )
    expect(urlToApplicationRoute(url(path))).toEqual(route)
    expect(maybeIssueId(route)).toEqual(Option.some('issue-101'))
    expect(maybeRouteFilters(route)).toEqual(Option.some(customFilters))
  })

  test('adds and removes the selected issue without changing the Board Route', () => {
    const boardRoute = ApplicationRoute.Board({ projectId: 'platform' })
    const routeWithIssue = withIssueId(boardRoute, 'issue-101')

    expect(routeWithIssue).toEqual(
      ApplicationRoute.Board({ projectId: 'platform', issueId: 'issue-101' }),
    )
    expect(routeToPath(routeWithIssue)).toBe(
      '/projects/platform/board?issue=issue-101',
    )
    expect(urlToApplicationRoute(url(routeToPath(routeWithIssue)))).toEqual(
      routeWithIssue,
    )
    expect(withoutIssueId(routeWithIssue)).toEqual(boardRoute)
    expect(routeToPath(withoutIssueId(routeWithIssue))).toBe(
      boardRouter({ projectId: 'platform' }),
    )
  })

  test('keeps filters while changing or removing the selected issue', () => {
    const route = ApplicationRoute.SavedView({
      viewId: 'mine',
      filters: customFilters,
      issueId: 'issue-101',
    })
    const routeWithNextIssue = withIssueId(route, 'issue-102')

    expect(routeWithNextIssue).toEqual(
      ApplicationRoute.SavedView({
        viewId: 'mine',
        filters: customFilters,
        issueId: 'issue-102',
      }),
    )
    expect(withoutIssueId(routeWithNextIssue)).toEqual(
      ApplicationRoute.SavedView({ viewId: 'mine', filters: customFilters }),
    )
    expect(withRouteFilters(routeWithNextIssue, defaultIssueFilters)).toEqual(
      ApplicationRoute.SavedView({
        viewId: 'mine',
        filters: defaultIssueFilters,
        issueId: 'issue-102',
      }),
    )
    expect(
      routeToPath(withRouteFilters(routeWithNextIssue, defaultIssueFilters)),
    ).toBe('/views/mine?filters=1&issue=issue-102')
  })

  test('keeps standalone issue links', () => {
    const path = issueRouter({ issueId: 'issue-101' })
    const route = urlToApplicationRoute(url(path))

    expect(path).toBe('/issues/issue-101')
    expect(route).toEqual(ApplicationRoute.Issue({ issueId: 'issue-101' }))
    expect(maybeIssueId(route)).toEqual(Option.some('issue-101'))
  })

  test('restricts optional issue selection to page Routes', () => {
    const isValidPageRoute = Schema.is(PageRoute)

    expect(
      isValidPageRoute(ApplicationRoute.Board({ projectId: 'platform' })),
    ).toBe(true)
    expect(
      isValidPageRoute(ApplicationRoute.Issue({ issueId: 'issue-101' })),
    ).toBe(false)
    expect(
      isValidPageRoute(ApplicationRoute.NotFound({ path: '/unknown' })),
    ).toBe(false)
  })

  test('stores only the selected issue identity in the Route Schema', () => {
    const route = ApplicationRoute.Board({
      projectId: 'platform',
      issueId: 'issue-101',
    })
    const encodedRoute = Schema.encodeSync(ApplicationRoute)(route)

    expect(encodedRoute).toEqual({
      _tag: 'Board',
      projectId: 'platform',
      issueId: 'issue-101',
    })
    expect(Schema.decodeSync(ApplicationRoute)(encodedRoute)).toEqual(route)
    expect(
      Schema.is(ApplicationRoute)({
        _tag: 'Board',
        projectId: 'platform',
        issueId: 42,
      }),
    ).toBe(false)
    expect(
      maybeIssueId(ApplicationRoute.NotFound({ path: '/unknown' })),
    ).toEqual(Option.none())
  })
})
