import { Effect, Equal, Equivalence, Option, Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { Transition, defineRouteUnion, literal } from 'foldkit/route'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

const AppRoute = defineRouteUnion({
  Home: {},
  Search: {
    q: Schema.Option(Schema.String),
    page: Schema.Number,
    sort: Schema.Option(Schema.Literals(['Relevance', 'Newest'])),
  },
  NotFound: { path: Schema.String },
})

type AppRoute = typeof AppRoute.Type
type SearchRoute = typeof AppRoute.Search.Type

const searchRouter = pipe(
  literal('search'),
  Route.query(
    Schema.Struct({
      q: Schema.OptionFromOptional(Schema.String),
      page: Schema.FiniteFromString.pipe(
        Schema.withDecodingDefaultKey(Effect.succeed('1')),
      ),
      sort: Schema.OptionFromOptional(Schema.Literals(['Relevance', 'Newest'])),
    }),
  ),
  Route.mapTo(AppRoute.Search),
)

const urlToAppRoute = Route.parseUrlWithFallback(
  Route.oneOf(searchRouter),
  AppRoute.NotFound,
)

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const searchRouteFrom = (raw: string): SearchRoute => {
  const route = urlToAppRoute(urlOrThrow(raw))

  if (route._tag === 'Search') {
    return route
  } else {
    throw new Error(`Expected a Search route for ${raw}`)
  }
}

const SearchCriteria = Schema.Struct({
  q: Schema.Option(Schema.String),
  page: Schema.Number,
})

const searchCriteriaEquivalence = Schema.toEquivalence(SearchCriteria)

const haveSearchFieldsChangedInline = (
  previousRoute: SearchRoute,
  nextRoute: SearchRoute,
): boolean =>
  !Equal.equals(previousRoute.q, nextRoute.q) ||
  previousRoute.page !== nextRoute.page

const haveSelectionChanged =
  <RouteValue, SelectedFields>(
    select: (route: RouteValue) => SelectedFields,
    equivalence: Equivalence.Equivalence<SelectedFields>,
  ) =>
  (previousRoute: RouteValue, nextRoute: RouteValue): boolean =>
    !equivalence(select(previousRoute), select(nextRoute))

const haveSearchFieldsChangedWithSelector = haveSelectionChanged(
  (route: SearchRoute) => ({ q: route.q, page: route.page }),
  searchCriteriaEquivalence,
)

type SearchFieldsChanged = (
  previousRoute: SearchRoute,
  nextRoute: SearchRoute,
) => boolean

const makeSearchPolicy =
  (haveSearchFieldsChanged: SearchFieldsChanged) =>
  (transition: Transition.Transition<AppRoute>): 'Fetch' | 'Keep' =>
    Transition.matchOrElse<'Fetch' | 'Keep'>()(
      transition,
      'Search',
      {
        Entered: () => 'Fetch',
        Stayed: ({ previousRoute, nextRoute }) =>
          haveSearchFieldsChanged(previousRoute, nextRoute) ? 'Fetch' : 'Keep',
      },
      () => 'Keep',
    )

const inlineSearchPolicy = makeSearchPolicy(haveSearchFieldsChangedInline)
const selectedSearchPolicy = makeSearchPolicy(
  haveSearchFieldsChangedWithSelector,
)

const policies = [
  { name: 'inline comparison', decide: inlineSearchPolicy },
  { name: 'selector and equivalence', decide: selectedSearchPolicy },
]

const transitionCases = [
  {
    name: 'a changed query',
    previousRoute: searchRouteFrom('http://localhost/search?q=alice&page=1'),
    nextRoute: searchRouteFrom('http://localhost/search?q=bob&page=1'),
    expected: 'Fetch',
  },
  {
    name: 'a changed page',
    previousRoute: searchRouteFrom('http://localhost/search?q=alice&page=1'),
    nextRoute: searchRouteFrom('http://localhost/search?q=alice&page=2'),
    expected: 'Fetch',
  },
  {
    name: 'an unchanged query and page with a changed sort',
    previousRoute: searchRouteFrom(
      'http://localhost/search?q=alice&page=1&sort=Relevance',
    ),
    nextRoute: searchRouteFrom(
      'http://localhost/search?q=alice&page=1&sort=Newest',
    ),
    expected: 'Keep',
  },
  {
    name: 'an omitted query and a supplied query',
    previousRoute: searchRouteFrom('http://localhost/search'),
    nextRoute: searchRouteFrom('http://localhost/search?q=alice'),
    expected: 'Fetch',
  },
  {
    name: 'an omitted page and its explicit default',
    previousRoute: searchRouteFrom('http://localhost/search?q=alice'),
    nextRoute: searchRouteFrom('http://localhost/search?q=alice&page=1'),
    expected: 'Keep',
  },
  {
    name: 'the same optional query and page when the query is absent',
    previousRoute: searchRouteFrom('http://localhost/search'),
    nextRoute: searchRouteFrom('http://localhost/search?sort=Newest'),
    expected: 'Keep',
  },
  {
    name: 'the same fields in a different query parameter order',
    previousRoute: searchRouteFrom(
      'http://localhost/search?q=alice&page=1&sort=Relevance',
    ),
    nextRoute: searchRouteFrom(
      'http://localhost/search?sort=Relevance&page=1&q=alice',
    ),
    expected: 'Keep',
  },
]

describe.each(policies)('$name', ({ decide }) => {
  test.each(transitionCases)('$name returns $expected', testCase => {
    expect(
      decide(
        Transition.make<AppRoute>(testCase.previousRoute, testCase.nextRoute),
      ),
    ).toBe(testCase.expected)
  })

  test('fetches when a cold load enters Search', () => {
    expect(
      decide(
        Transition.coldLoad<AppRoute>(
          searchRouteFrom('http://localhost/search'),
        ),
      ),
    ).toBe('Fetch')
  })

  test('fetches when navigation enters Search', () => {
    expect(
      decide(
        Transition.make<AppRoute>(
          AppRoute.Home(),
          searchRouteFrom('http://localhost/search'),
        ),
      ),
    ).toBe('Fetch')
  })
})
