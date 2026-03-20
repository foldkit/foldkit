import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command, Route, Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'
import { int, literal, r, slash } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

// ROUTE

const HomeRoute = r('Home')
const NestedRoute = r('Nested')
const PeopleRoute = r('People', { searchText: S.Option(S.String) })
const PersonRoute = r('Person', { personId: S.Number })
const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union(
  HomeRoute,
  NestedRoute,
  PeopleRoute,
  PersonRoute,
  NotFoundRoute,
)

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
      searchText: S.OptionFromUndefinedOr(S.String),
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

const Model = S.Struct({
  route: AppRoute,
})

type Model = typeof Model.Type

// MESSAGE

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedLoadExternal = m('CompletedLoadExternal')
const ClickedLink = m('ClickedLink', {
  request: Runtime.UrlRequest,
})
const ChangedUrl = m('ChangedUrl', { url: Url })
const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })

export const Message = S.Union(
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  ChangedSearchInput,
)
export type Message = typeof Message.Type

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [{ route: urlToAppRoute(url) }, []]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
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
            ] => [
              model,
              [
                pushUrl(urlToString(url)).pipe(
                  Effect.as(CompletedNavigateInternal()),
                  Command.make('NavigateInternal'),
                ),
              ],
            ],
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedLoadExternal>>,
            ] => [
              model,
              [
                load(href).pipe(
                  Effect.as(CompletedLoadExternal()),
                  Command.make('LoadExternal'),
                ),
              ],
            ],
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
          replaceUrl(
            peopleRouter({
              searchText: Option.fromNullable(value || null),
            }),
          ).pipe(
            Effect.as(CompletedNavigateInternal()),
            Command.make('ReplaceSearchUrl'),
          ),
        ],
      ],
    }),
  )

// VIEW

const {
  a,
  article,
  div,
  h1,
  h2,
  header,
  input,
  keyed,
  li,
  main,
  nav,
  p,
  search,
  ul,
  Class,
  Href,
  OnInput,
  Placeholder,
  Value,
} = html<Message>()

const navigationView = (currentRoute: AppRoute): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return nav(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      ul(
        [Class('max-w-4xl mx-auto flex gap-6 list-none')],
        [
          li(
            [],
            [
              a(
                [
                  Href(homeRouter()),
                  Class(navLinkClassName(currentRoute._tag === 'Home')),
                ],
                ['Home'],
              ),
            ],
          ),
          li(
            [],
            [
              a(
                [
                  Href(peopleRouter({ searchText: Option.none() })),
                  Class(
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
          li(
            [],
            [
              a(
                [
                  Href(nestedRouter()),
                  Class(navLinkClassName(currentRoute._tag === 'Nested')),
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

const homeView = (): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['Welcome Home']),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [
          'This is a routing example built with foldkit. Navigate using the links above to see different routes in action.',
        ],
      ),
      p([Class('text-gray-600')], []),
    ],
  )

const nestedView = (): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1(
        [Class('text-4xl font-bold text-gray-800 mb-6')],
        ['Very Nested Route!'],
      ),
      p(
        [Class('text-lg text-gray-600')],
        ['You found the deeply nested route at /nested/route/is/very/nested'],
      ),
    ],
  )

const peopleView = (searchText: Option.Option<string>): Html => {
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

  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),

      search(
        [Class('mb-6')],
        [
          input([
            Value(Option.getOrElse(searchText, () => '')),
            Placeholder('Search by name or role...'),
            Class(
              'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
            OnInput(value => ChangedSearchInput({ value })),
          ]),
        ],
      ),

      p(
        [Class('text-lg text-gray-600 mb-6')],
        [
          Option.match(searchText, {
            onNone: () => 'Click on any person to view their details:',
            onSome: query =>
              `Searching for "${query}" - ${Array.length(filteredPeople)} results:`,
          }),
        ],
      ),
      ul(
        [Class('space-y-3')],
        Array.map(filteredPeople, person =>
          li(
            [Class('border border-gray-200 rounded-lg hover:bg-gray-50')],
            [
              a(
                [
                  Href(personRouter({ personId: person.id })),
                  Class('block p-4 '),
                ],
                [
                  div(
                    [Class('flex justify-between items-center')],
                    [
                      h2(
                        [Class('text-xl font-semibold text-gray-800')],
                        [person.name],
                      ),
                      p([Class('text-gray-600')], [person.role]),
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
  const person = findPerson(personId)

  return Option.match(person, {
    onNone: () =>
      div(
        [Class('max-w-4xl mx-auto px-4')],
        [
          h2(
            [Class('text-4xl font-bold text-red-600 mb-6')],
            ['Person Not Found'],
          ),
          p(
            [Class('text-lg text-gray-600 mb-4')],
            [`No person found with ID: ${personId}`],
          ),
          a(
            [
              Href(peopleRouter({ searchText: Option.none() })),
              Class('text-blue-500 hover:underline'),
            ],
            ['← Back to People'],
          ),
        ],
      ),

    onSome: person =>
      div(
        [Class('max-w-4xl mx-auto px-4')],
        [
          a(
            [
              Href(peopleRouter({ searchText: Option.none() })),
              Class('text-blue-500 hover:underline mb-4 inline-block'),
            ],
            ['← Back to People'],
          ),

          article(
            [],
            [
              h2(
                [Class('text-4xl font-bold text-gray-800 mb-6')],
                [person.name],
              ),

              div(
                [Class('bg-gray-50 border border-gray-200 rounded-lg p-6')],
                [
                  div(
                    [Class('grid grid-cols-2 gap-4')],
                    [
                      div(
                        [],
                        [
                          h2(
                            [
                              Class(
                                'text-sm font-medium text-gray-500 uppercase tracking-wide',
                              ),
                            ],
                            ['ID'],
                          ),
                          p(
                            [Class('text-lg text-gray-900 mt-1')],
                            [String(person.id)],
                          ),
                        ],
                      ),
                      div(
                        [],
                        [
                          h2(
                            [
                              Class(
                                'text-sm font-medium text-gray-500 uppercase tracking-wide',
                              ),
                            ],
                            ['Role'],
                          ),
                          p(
                            [Class('text-lg text-gray-900 mt-1')],
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

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1(
        [Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      a(
        [Href(homeRouter()), Class('text-blue-500 hover:underline')],
        ['← Go Home'],
      ),
    ],
  )

const view = (model: Model): Html => {
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
      Nested: nestedView,
      People: ({ searchText }) => peopleView(searchText),
      Person: ({ personId }) => personView(personId),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return div(
    [Class('min-h-screen bg-gray-100')],
    [
      header([], [navigationView(model.route)]),
      main(
        [Class('py-8')],
        [keyed('div')(model.route._tag, [], [routeContent])],
      ),
    ],
  )
}

// RUN

const app = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(app)
