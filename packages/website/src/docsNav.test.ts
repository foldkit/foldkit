import { Option } from 'effect'
import { describe, expect, test } from 'vitest'

import { findActiveSectionKey, pageNeighbors } from './docsNav'
import { AppRoute } from './route'

describe('findActiveSectionKey', () => {
  test.each([
    { route: AppRoute.Blog(), expectedKey: 'blog' },
    { route: AppRoute.BlogPost({ postSlug: 'hello' }), expectedKey: 'blog' },
    { route: AppRoute.WhyFoldkit(), expectedKey: 'introduction' },
    { route: AppRoute.Roadmap(), expectedKey: 'introduction' },
    { route: AppRoute.CoreModel(), expectedKey: 'coreConcepts' },
    { route: AppRoute.ComingFromReact(), expectedKey: 'comparisons' },
    { route: AppRoute.ReactComparison(), expectedKey: 'comparisons' },
    { route: AppRoute.EffectAtomComparison(), expectedKey: 'comparisons' },
    { route: AppRoute.ComingFromTanStackQuery(), expectedKey: 'comparisons' },
    { route: AppRoute.ElmComparison(), expectedKey: 'comparisons' },
    { route: AppRoute.ProjectOrganization(), expectedKey: 'patterns' },
    { route: AppRoute.PatternsAntiPatterns(), expectedKey: 'patterns' },
    { route: AppRoute.ToolingLinting(), expectedKey: 'tooling' },
    { route: AppRoute.Performance(), expectedKey: 'faq' },
    { route: AppRoute.UiButton(), expectedKey: 'foldkitUi' },
    { route: AppRoute.AiOverview(), expectedKey: 'ai' },
    { route: AppRoute.Testing(), expectedKey: 'testing' },
    { route: AppRoute.BestPracticesKeying(), expectedKey: 'bestPractices' },
    { route: AppRoute.Examples(), expectedKey: 'examples' },
    {
      route: AppRoute.ExampleDetail({ exampleSlug: 'counter' }),
      expectedKey: 'examples',
    },
    {
      route: AppRoute.ApiModule({ moduleSlug: 'runtime' }),
      expectedKey: 'apiReference',
    },
  ])(
    '$route resolves to the $expectedKey section',
    ({ route, expectedKey }) => {
      expect(Option.getOrNull(findActiveSectionKey(route))).toBe(expectedKey)
    },
  )

  test('a route in no section resolves to none', () => {
    expect(Option.getOrNull(findActiveSectionKey(AppRoute.Home()))).toBeNull()
  })
})

describe('pageNeighbors', () => {
  const neighborRoutes = (route: AppRoute) => {
    const { maybePrevious, maybeNext } = pageNeighbors(route)

    return {
      maybePreviousRoute: Option.map(maybePrevious, page => page.route),
      maybeNextRoute: Option.map(maybeNext, page => page.route),
    }
  }

  test('an example detail page links to the sidebar pages around it', () => {
    expect(
      neighborRoutes(AppRoute.ExampleDetail({ exampleSlug: 'counters' })),
    ).toStrictEqual({
      maybePreviousRoute: Option.some(
        AppRoute.ExampleDetail({ exampleSlug: 'counter' }),
      ),
      maybeNextRoute: Option.some(
        AppRoute.ExampleDetail({ exampleSlug: 'todo' }),
      ),
    })
  })

  test('a docs page links to the sidebar pages around it', () => {
    expect(neighborRoutes(AppRoute.CoreArchitecture())).toStrictEqual({
      maybePreviousRoute: Option.some(AppRoute.Roadmap()),
      maybeNextRoute: Option.some(AppRoute.CoreCounterExample()),
    })
  })

  test('a page outside the sidebar has no neighbors', () => {
    expect(
      neighborRoutes(AppRoute.ApiModule({ moduleSlug: 'runtime' })),
    ).toStrictEqual({
      maybePreviousRoute: Option.none(),
      maybeNextRoute: Option.none(),
    })
  })
})
