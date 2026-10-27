import { Option, Schema } from 'effect'
import * as Url from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { IssueFilters } from './domain'
import {
  ApplicationRoute,
  defaultIssueFilters,
  issueRouter,
  issuesRouter,
  myIssuesRouter,
  projectRouter,
  routeFilters,
  routeForPageContent,
  routeToPath,
  savedViewRouter,
  urlToApplicationRoute,
  withRouteFilters,
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

    const board = ApplicationRoute.Board({ projectId: 'platform' })

    expect(withRouteFilters(board, filtered)).toBe(board)
  })
})

describe('Issue return context', () => {
  test('round-trips a filtered list return target as a typed Route', () => {
    const returnTo = ApplicationRoute.Project({
      projectId: 'platform',
      filters: filtered,
    })
    const path = issueRouter({ issueId: 'issue-101', returnTo })

    expect(path).toBe(
      '/issues/issue-101?returnTo=%2Fprojects%2Fplatform%3Fsearch%3Dcache%2B%2526%2Brouting%26status%3DTodo%26sort%3DPriority%26group%3DStatus',
    )

    const route = urlToApplicationRoute(url(path))

    expect(route).toEqual(
      ApplicationRoute.Issue({ issueId: 'issue-101', returnTo }),
    )
    expect(routeForPageContent(route)).toEqual(returnTo)
    expect(routeToPath(route)).toBe(path)
  })

  test('selects an already typed page Route without replacing it', () => {
    const returnTo = ApplicationRoute.Board({ projectId: 'platform' })
    const route = ApplicationRoute.Issue({ issueId: 'issue-101', returnTo })

    expect(routeForPageContent(route)).toBe(route.returnTo)
    expect(routeForPageContent(returnTo)).toBe(returnTo)
  })

  test('decodes the Board and ignores unrelated return query fields', () => {
    const path =
      '/issues/issue-101?returnTo=' +
      encodeURIComponent('/projects/platform/board?ignored=yes')
    const route = urlToApplicationRoute(url(path))

    expect(route).toEqual(
      ApplicationRoute.Issue({
        issueId: 'issue-101',
        returnTo: ApplicationRoute.Board({ projectId: 'platform' }),
      }),
    )
  })

  test.each([
    'https://evil.example/projects/platform/board',
    '//evil.example/projects/platform/board',
    '/issues/issue-202',
    '/issues/issue-202?returnTo=%2F',
    '/unknown',
  ])('falls back when the URL return target is unsupported: %s', returnTo => {
    const path = `/issues/issue-101?${new URLSearchParams({ returnTo })}`
    const route = urlToApplicationRoute(url(path))

    expect(route).toEqual(ApplicationRoute.Issue({ issueId: 'issue-101' }))
    expect(routeForPageContent(route)).toEqual(
      ApplicationRoute.Issues({ filters: defaultIssueFilters }),
    )
  })

  test('preserves omitted and explicit-root return targets', () => {
    const withoutReturnTo = ApplicationRoute.Issue({ issueId: 'issue-101' })
    const withRootReturnTo = ApplicationRoute.Issue({
      issueId: 'issue-101',
      returnTo: ApplicationRoute.Issues({}),
    })

    expect(routeToPath(withoutReturnTo)).toBe('/issues/issue-101')
    expect(routeToPath(withRootReturnTo)).toBe('/issues/issue-101?returnTo=%2F')
    expect(urlToApplicationRoute(url(routeToPath(withoutReturnTo)))).toEqual(
      withoutReturnTo,
    )
    expect(urlToApplicationRoute(url(routeToPath(withRootReturnTo)))).toEqual(
      withRootReturnTo,
    )
  })

  test('keeps URL strings out of the application Route Schema', () => {
    const route = ApplicationRoute.Issue({
      issueId: 'issue-101',
      returnTo: ApplicationRoute.Board({ projectId: 'platform' }),
    })
    const encoded = Schema.encodeSync(ApplicationRoute)(route)

    expect(encoded).toEqual(route)
    expect(Schema.decodeUnknownSync(ApplicationRoute)(encoded)).toEqual(route)
    for (const returnTo of [
      '/projects/platform/board',
      ApplicationRoute.NotFound({ path: '/unknown' }),
      ApplicationRoute.Issue({ issueId: 'issue-102' }),
    ]) {
      expect(
        Schema.is(ApplicationRoute)({
          _tag: 'Issue',
          issueId: 'issue-101',
          returnTo,
        }),
      ).toBe(false)
    }
  })
})
