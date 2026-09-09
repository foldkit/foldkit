import { Option } from 'effect'
import { fromString as urlFromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import * as Route from './route'

const SITE = 'https://foldkit.dev'

// Routers that take route data; excluded from the parameterless round-trip
// below because calling them without it throws.
const PARAMETERIZED_ROUTERS: ReadonlySet<string> = new Set([
  'exampleDetailRouter',
  'apiModuleRouter',
  'playgroundRouter',
  'blogPostRouter',
])

const expectedTag = (routerName: string): string => {
  const base = routerName.slice(0, -'Router'.length)
  return base.charAt(0).toUpperCase() + base.slice(1)
}

const isUrlBuilder = (value: unknown): value is () => string =>
  typeof value === 'function'

const parameterlessRouters: ReadonlyArray<readonly [string, string]> =
  Object.entries(Route).flatMap(([name, value]) => {
    if (
      !name.endsWith('Router') ||
      PARAMETERIZED_ROUTERS.has(name) ||
      !isUrlBuilder(value)
    ) {
      return []
    }
    const entry: readonly [string, string] = [name, value()]
    return [entry]
  })

describe('route table', () => {
  test.each(parameterlessRouters)(
    '%s builds a URL that parses back to its own route',
    (name, path) => {
      const parsed = Route.urlToAppRoute(
        Option.getOrThrow(urlFromString(`${SITE}${path}`)),
      )
      expect(parsed._tag).toBe(expectedTag(name))
    },
  )
})

describe('blog routes', () => {
  test('parses /blog/<slug> into BlogPost', () => {
    const parsed = Route.urlToAppRoute(
      Option.getOrThrow(
        urlFromString(`${SITE}/blog/introducing-the-foldkit-blog`),
      ),
    )

    expect(parsed).toEqual(
      Route.AppRoute.BlogPost({ postSlug: 'introducing-the-foldkit-blog' }),
    )
  })

  test('builds a post URL that parses back to its route', () => {
    const path = Route.blogPostRouter({ postSlug: 'some-post' })

    expect(path).toBe('/blog/some-post')

    const parsed = Route.urlToAppRoute(
      Option.getOrThrow(urlFromString(`${SITE}${path}`)),
    )
    expect(parsed).toEqual(Route.AppRoute.BlogPost({ postSlug: 'some-post' }))
  })

  test('leaves /blog/rss.xml to the static feed file', () => {
    const parsed = Route.urlToAppRoute(
      Option.getOrThrow(urlFromString(`${SITE}/blog/rss.xml`)),
    )

    expect(parsed._tag).toBe('NotFound')
  })
})

describe('section predicates', () => {
  const cases: ReadonlyArray<
    Readonly<{
      name: string
      route: Route.AppRoute
      isDocsSection: boolean
      isBlog: boolean
      isSearch: boolean
    }>
  > = [
    {
      name: 'GetStarted',
      route: Route.AppRoute.GetStarted(),
      isDocsSection: true,
      isBlog: false,
      isSearch: true,
    },
    {
      name: 'CoreArchitecture',
      route: Route.AppRoute.CoreArchitecture(),
      isDocsSection: true,
      isBlog: false,
      isSearch: true,
    },
    {
      name: 'Home',
      route: Route.AppRoute.Home(),
      isDocsSection: false,
      isBlog: false,
      isSearch: true,
    },
    {
      name: 'Newsletter',
      route: Route.AppRoute.Newsletter(),
      isDocsSection: false,
      isBlog: false,
      isSearch: true,
    },
    {
      name: 'Playground',
      route: Route.AppRoute.Playground({ exampleSlug: 'counter' }),
      isDocsSection: false,
      isBlog: false,
      isSearch: false,
    },
    {
      name: 'NotFound',
      route: Route.AppRoute.NotFound({ path: '/missing' }),
      isDocsSection: false,
      isBlog: false,
      isSearch: true,
    },
    {
      name: 'Blog',
      route: Route.AppRoute.Blog(),
      isDocsSection: false,
      isBlog: true,
      isSearch: true,
    },
    {
      name: 'BlogPost',
      route: Route.AppRoute.BlogPost({ postSlug: 'some-post' }),
      isDocsSection: false,
      isBlog: true,
      isSearch: true,
    },
  ]

  test.each(cases)(
    '$name: isDocsSectionRoute $isDocsSection, isBlogRoute $isBlog, isSearchRoute $isSearch',
    ({ route, isDocsSection, isBlog, isSearch }) => {
      expect(Route.isDocsSectionRoute(route)).toBe(isDocsSection)
      expect(Route.isBlogRoute(route)).toBe(isBlog)
      expect(Route.isSearchRoute(route)).toBe(isSearch)
    },
  )
})
