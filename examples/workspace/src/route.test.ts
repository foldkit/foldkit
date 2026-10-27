import { Option, Schema } from 'effect'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { IssueFilters } from './domain'
import {
  ApplicationRoute,
  boardRouter,
  defaultIssueFilters,
  issueRouter,
  issuesRouter,
  maybeIssueId,
  myIssuesRouter,
  projectRouter,
  routeFilters,
  routeToPath,
  savedViewRouter,
  urlToApplicationRoute,
  withIssue,
  withRouteFilters,
  withoutIssue,
} from './route'

const url = (path: string) =>
  Option.getOrThrow(Url.fromString(`https://workspace.test${path}`))

const filtered = IssueFilters.make({
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
    const path = issuesRouter({ filters: filtered })

    expect(path).toBe(
      '/?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
    )

    const route = urlToApplicationRoute(url(path))

    expect(route).toEqual(ApplicationRoute.Issues({ filters: filtered }))
    expect(routeFilters(route)).toEqual(Option.some(filtered))
    expect(routeToPath(route)).toBe(path)
  })

  test('supports the same filters on My Issues, Project, and Saved View', () => {
    const paths = [
      myIssuesRouter({ filters: filtered }),
      projectRouter({ projectId: 'platform', filters: filtered }),
      savedViewRouter({ viewId: 'mine', filters: filtered }),
    ]

    expect(paths).toEqual([
      '/my-issues?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
      '/projects/platform?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
      '/views/mine?search=cache+%26+routing&status=Todo&sort=Priority&group=Status',
    ])

    for (const path of paths) {
      expect(routeFilters(urlToApplicationRoute(url(path)))).toEqual(
        Option.some(filtered),
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

    expect(routeFilters(urlToApplicationRoute(url('/views/mine')))).toEqual(
      Option.none(),
    )
    expect(
      routeFilters(urlToApplicationRoute(url('/views/mine?filters=1'))),
    ).toEqual(Option.some(defaultIssueFilters))
  })

  test('defaults malformed filter values without rejecting the route', () => {
    const route = urlToApplicationRoute(
      url('/?search=release%2Fnotes&status=Unknown&sort=Newest&group=Owner'),
    )

    expect(routeFilters(route)).toEqual(
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
        filtered,
      ),
    ).toEqual(
      ApplicationRoute.Project({ projectId: 'platform', filters: filtered }),
    )

    const mine = ApplicationRoute.MyIssues({ issueId: 'issue-101' })
    expect(withRouteFilters(mine, filtered)).toEqual(
      ApplicationRoute.MyIssues({ issueId: 'issue-101', filters: filtered }),
    )

    const board = ApplicationRoute.Board({ projectId: 'platform' })

    expect(withRouteFilters(board, filtered)).toBe(board)
  })
})

describe('issue panels', () => {
  test('round-trips a filtered Project with an open issue', () => {
    const route = ApplicationRoute.Project({
      projectId: 'platform',
      filters: filtered,
      issueId: 'issue-101',
    })
    const path = routeToPath(route)

    expect(path).toBe(
      '/projects/platform?search=cache+%26+routing&status=Todo&sort=Priority&group=Status&issue=issue-101',
    )
    expect(urlToApplicationRoute(url(path))).toEqual(route)
    expect(maybeIssueId(route)).toEqual(Option.some('issue-101'))
    expect(routeFilters(route)).toEqual(Option.some(filtered))
  })

  test('opens and closes a Board panel without changing the page', () => {
    const board = ApplicationRoute.Board({ projectId: 'platform' })
    const opened = withIssue(board, 'issue-101')

    expect(opened).toEqual(
      ApplicationRoute.Board({ projectId: 'platform', issueId: 'issue-101' }),
    )
    expect(routeToPath(opened)).toBe('/projects/platform/board?issue=issue-101')
    expect(urlToApplicationRoute(url(routeToPath(opened)))).toEqual(opened)
    expect(withoutIssue(opened)).toEqual(board)
    expect(routeToPath(withoutIssue(opened))).toBe(
      boardRouter({ projectId: 'platform' }),
    )
  })

  test('keeps filters while switching issues or closing a panel', () => {
    const route = ApplicationRoute.SavedView({
      viewId: 'mine',
      filters: filtered,
      issueId: 'issue-101',
    })
    const switched = withIssue(route, 'issue-102')

    expect(switched).toEqual(
      ApplicationRoute.SavedView({
        viewId: 'mine',
        filters: filtered,
        issueId: 'issue-102',
      }),
    )
    expect(withoutIssue(switched)).toEqual(
      ApplicationRoute.SavedView({ viewId: 'mine', filters: filtered }),
    )
    expect(withRouteFilters(switched, defaultIssueFilters)).toEqual(
      ApplicationRoute.SavedView({
        viewId: 'mine',
        filters: defaultIssueFilters,
        issueId: 'issue-102',
      }),
    )
    expect(routeToPath(withRouteFilters(switched, defaultIssueFilters))).toBe(
      '/views/mine?filters=1&issue=issue-102',
    )
  })

  test('keeps standalone issue links and closes them to All issues', () => {
    const path = issueRouter({ issueId: 'issue-101' })
    const route = urlToApplicationRoute(url(path))

    expect(path).toBe('/issues/issue-101')
    expect(route).toEqual(ApplicationRoute.Issue({ issueId: 'issue-101' }))
    expect(maybeIssueId(route)).toEqual(Option.some('issue-101'))
    expect(routeToPath(withoutIssue(route))).toBe('/')
    expect(maybeIssueId(withoutIssue(route))).toEqual(Option.none())
  })

  test('opens from an unknown page and leaves an unknown page unchanged on close', () => {
    const route = ApplicationRoute.NotFound({ path: '/unknown' })

    expect(withIssue(route, 'issue-101')).toEqual(
      ApplicationRoute.Issues({ issueId: 'issue-101' }),
    )
    expect(withoutIssue(route)).toBe(route)
    expect(
      withIssue(ApplicationRoute.Issue({ issueId: 'issue-101' }), 'issue-102'),
    ).toEqual(ApplicationRoute.Issue({ issueId: 'issue-102' }))
  })

  test('stores only the selected issue identity in the Route Schema', () => {
    const route = ApplicationRoute.Board({
      projectId: 'platform',
      issueId: 'issue-101',
    })
    const encoded = Schema.encodeSync(ApplicationRoute)(route)

    expect(encoded).toEqual({
      _tag: 'Board',
      projectId: 'platform',
      issueId: 'issue-101',
    })
    expect(Schema.decodeUnknownSync(ApplicationRoute)(encoded)).toEqual(route)
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
