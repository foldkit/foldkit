import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command, Route, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { int, literal, r, slash } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

// ROUTE

export const HomeRoute = r('Home')
export const NestedRoute = r('Nested')
export const PeopleRoute = r('People', { searchText: S.Option(S.String) })
export const PersonRoute = r('Person', { personId: S.Number })
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([
  HomeRoute,
  NestedRoute,
  PeopleRoute,
  PersonRoute,
  NotFoundRoute,
])

type HomeRoute = typeof HomeRoute.Type
type NestedRoute = typeof NestedRoute.Type
type PeopleRoute = typeof PeopleRoute.Type
type PersonRoute = typeof PersonRoute.Type
type NotFoundRoute = typeof NotFoundRoute.Type

export type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))

const nestedRouter = pipe(
  literal('nested'),
  slash(literal('route')),
  slash(literal('is')),
  slash(literal('very')),
  slash(literal('nested')),
  Route.mapTo(NestedRoute),
)

const peopleRouter = pipe(
  literal('people'),
  Route.query(
    S.Struct({
      searchText: S.OptionFromOptional(S.String),
    }),
  ),
  Route.mapTo(PeopleRoute),
)

const personRouter = pipe(
  literal('people'),
  slash(int('personId')),
  Route.mapTo(PersonRoute),
)

const routeParser = Route.oneOf(
  personRouter,
  peopleRouter,
  nestedRouter,
  homeRouter,
)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

const people = [
  { id: 1, name: 'Alice Johnson', role: 'Designer' },
  { id: 2, name: 'Bob Smith', role: 'Developer' },
  { id: 3, name: 'Carol Davis', role: 'Manager' },
  { id: 4, name: 'David Wilson', role: 'Developer' },
  { id: 5, name: 'Eva Brown', role: 'Designer' },
]

const findPerson = (id: number) =>
  Array.findFirst(people, person => person.id === id)

// MODEL

export const Model = S.Struct({
  route: AppRoute,
})

export type Model = typeof Model.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  ChangedSearchInput,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingProgramInit<Model, Message> = (url: Url) => {
  return [{ route: urlToAppRoute(url) }, []]
}

// COMMAND

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

export const ReplaceSearchUrl = Command.define(
  'ReplaceSearchUrl',
  { searchText: S.Option(S.String) },
  CompletedNavigateInternal,
)(({ searchText }) =>
  replaceUrl(peopleRouter({ searchText })).pipe(
    Effect.as(CompletedNavigateInternal()),
  ),
)

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedNavigateInternal>>,
            ] => [model, [NavigateInternal({ url: urlToString(url) })]],
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedLoadExternal>>,
            ] => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      ChangedSearchInput: ({ value }) => [
        model,
        [
          ReplaceSearchUrl({
            searchText: Option.fromNullishOr(value || null),
          }),
        ],
      ],
    }),
  )

// VIEW

const navigationView = (currentRoute: AppRoute): Html => {
  const h = html<Message>()

  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return h.nav(
    [h.Class('bg-blue-500 text-white p-4 mb-6')],
    [
      h.ul(
        [h.Class('max-w-4xl mx-auto flex gap-6 list-none')],
        [
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(homeRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Home')),
                ],
                ['Home'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(peopleRouter({ searchText: Option.none() })),
                  h.Class(
                    navLinkClassName(
                      currentRoute._tag === 'People' ||
                        currentRoute._tag === 'Person',
                    ),
                  ),
                ],
                ['People'],
              ),
            ],
          ),
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(nestedRouter()),
                  h.Class(navLinkClassName(currentRoute._tag === 'Nested')),
                ],
                ['Nested'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const homeView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        ['Welcome Home'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [
          'This is a routing example built with foldkit. Navigate using the links above to see different routes in action.',
        ],
      ),
      h.p([h.Class('text-gray-600')], []),
    ],
  )
}

const nestedView = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-gray-800 mb-6')],
        ['Very Nested Route!'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600')],
        ['You found the deeply nested route at /nested/route/is/very/nested'],
      ),
    ],
  )
}

const peopleView = (searchText: Option.Option<string>): Html => {
  const h = html<Message>()

  const filteredPeople = Option.match(searchText, {
    onNone: () => people,
    onSome: query =>
      Array.filter(
        people,
        person =>
          person.name.toLowerCase().includes(query.toLowerCase()) ||
          person.role.toLowerCase().includes(query.toLowerCase()),
      ),
  })

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),

      h.search(
        [h.Class('mb-6')],
        [
          h.input([
            h.Value(Option.getOrElse(searchText, () => '')),
            h.Placeholder('Search by name or role...'),
            h.Class(
              'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
            h.OnInput(value => ChangedSearchInput({ value })),
          ]),
        ],
      ),

      h.p(
        [h.Class('text-lg text-gray-600 mb-6')],
        [
          Option.match(searchText, {
            onNone: () => 'Click on any person to view their details:',
            onSome: query =>
              `Searching for "${query}" - ${Array.length(filteredPeople)} results:`,
          }),
        ],
      ),
      h.ul(
        [h.Class('space-y-3')],
        Array.map(filteredPeople, person =>
          h.li(
            [h.Class('border border-gray-200 rounded-lg hover:bg-gray-50')],
            [
              h.a(
                [
                  h.Href(personRouter({ personId: person.id })),
                  h.Class('block p-4 '),
                ],
                [
                  h.div(
                    [h.Class('flex justify-between items-center')],
                    [
                      h.h2(
                        [h.Class('text-xl font-semibold text-gray-800')],
                        [person.name],
                      ),
                      h.p([h.Class('text-gray-600')], [person.role]),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  )
}

const personView = (personId: number): Html => {
  const h = html<Message>()

  const person = findPerson(personId)

  return Option.match(person, {
    onNone: () =>
      h.div(
        [h.Class('max-w-4xl mx-auto px-4')],
        [
          h.h2(
            [h.Class('text-4xl font-bold text-red-600 mb-6')],
            ['Person Not Found'],
          ),
          h.p(
            [h.Class('text-lg text-gray-600 mb-4')],
            [`No person found with ID: ${personId}`],
          ),
          h.a(
            [
              h.Href(peopleRouter({ searchText: Option.none() })),
              h.Class('text-blue-500 hover:underline'),
            ],
            ['← Back to People'],
          ),
        ],
      ),

    onSome: person =>
      h.div(
        [h.Class('max-w-4xl mx-auto px-4')],
        [
          h.a(
            [
              h.Href(peopleRouter({ searchText: Option.none() })),
              h.Class('text-blue-500 hover:underline mb-4 inline-block'),
            ],
            ['← Back to People'],
          ),

          h.article(
            [],
            [
              h.h2(
                [h.Class('text-4xl font-bold text-gray-800 mb-6')],
                [person.name],
              ),

              h.div(
                [h.Class('bg-gray-50 border border-gray-200 rounded-lg p-6')],
                [
                  h.div(
                    [h.Class('grid grid-cols-2 gap-4')],
                    [
                      h.div(
                        [],
                        [
                          h.h2(
                            [
                              h.Class(
                                'text-sm font-medium text-gray-500 uppercase tracking-wide',
                              ),
                            ],
                            ['ID'],
                          ),
                          h.p(
                            [h.Class('text-lg text-gray-900 mt-1')],
                            [String(person.id)],
                          ),
                        ],
                      ),
                      h.div(
                        [],
                        [
                          h.h2(
                            [
                              h.Class(
                                'text-sm font-medium text-gray-500 uppercase tracking-wide',
                              ),
                            ],
                            ['Role'],
                          ),
                          h.p(
                            [h.Class('text-lg text-gray-900 mt-1')],
                            [person.role],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
  })
}

const notFoundView = (path: string): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1(
        [h.Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      h.p(
        [h.Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [h.Href(homeRouter()), h.Class('text-blue-500 hover:underline')],
        ['← Go Home'],
      ),
    ],
  )
}

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tag('Home', () => 'Routing'),
    M.tag('Person', ({ personId }) => `Person ${personId} — Routing`),
    M.orElse(({ _tag }) => `${_tag} — Routing`),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
      Nested: nestedView,
      People: ({ searchText }) => peopleView(searchText),
      Person: ({ personId }) => personView(personId),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('min-h-screen bg-gray-100')],
      [
        h.header([], [navigationView(model.route)]),
        h.main(
          [h.Class('py-8')],
          [h.keyed('div')(model.route._tag, [], [routeContent])],
        ),
      ],
    ),
  }
}
