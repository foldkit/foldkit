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
      Route.BlogPostRoute({ postSlug: 'introducing-the-foldkit-blog' }),
    )
  })

  test('builds a post URL that parses back to its route', () => {
    const path = Route.blogPostRouter({ postSlug: 'some-post' })

    expect(path).toBe('/blog/some-post')

    const parsed = Route.urlToAppRoute(
      Option.getOrThrow(urlFromString(`${SITE}${path}`)),
    )
    expect(parsed).toEqual(Route.BlogPostRoute({ postSlug: 'some-post' }))
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
    readonly [string, Route.AppRoute, boolean, boolean]
  > = [
    ['GettingStarted', Route.GettingStartedRoute(), true, false],
    ['CoreArchitecture', Route.CoreArchitectureRoute(), true, false],
    ['Home', Route.HomeRoute(), false, false],
    ['Newsletter', Route.NewsletterRoute(), false, false],
    ['NotFound', Route.NotFoundRoute({ path: '/missing' }), false, false],
    ['Blog', Route.BlogRoute(), false, true],
    ['BlogPost', Route.BlogPostRoute({ postSlug: 'some-post' }), false, true],
  ]

  test.each(cases)(
    '%s: isDocsSectionRoute %s, isBlogRoute %s',
    (_name, route, isDocsSection, isBlog) => {
      expect(Route.isDocsSectionRoute(route)).toBe(isDocsSection)
      expect(Route.isBlogRoute(route)).toBe(isBlog)
    },
  )
})
