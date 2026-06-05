import { Effect, Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { People } from './page'
import {
  AppRoute,
  PeopleRoute,
  homeRouter,
  nestedRouter,
  peopleRouter,
  urlToAppRoute,
} from './route'

export {
  AppRoute,
  HomeRoute,
  NestedRoute,
  NotFoundRoute,
  PeopleRoute,
  PersonRoute,
} from './route'

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  peoplePage: People.Model,
})

export type Model = typeof Model.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const GotPeopleMessage = m('GotPeopleMessage', {
  message: People.Message,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  GotPeopleMessage,
])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.RoutingProgramInit<Model, Message> = (url: Url) => {
  const route = urlToAppRoute(url)

  const initialPeopleRoute = M.value(route).pipe(
    M.tag('People', peopleRoute => peopleRoute),
    M.orElse(() => PeopleRoute({ searchText: Option.none() })),
  )

  const [peoplePage, peopleCommands] = People.init(initialPeopleRoute)

  return [
    { route, peoplePage },
    Command.mapMessages(peopleCommands, childMessage =>
      GotPeopleMessage({ message: childMessage }),
    ),
  ]
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

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [NavigateInternal({ url: urlToString(url) })],
            ],
            External: ({ href }) => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const modelWithNextRoute = evo(model, { route: () => nextRoute })

        return M.value(nextRoute).pipe(
          withUpdateReturn,
          M.tag('People', peopleRoute => {
            const [nextPeoplePage, peopleCommands] = People.informRouteChanged(
              modelWithNextRoute.peoplePage,
              peopleRoute,
            )
            return [
              evo(modelWithNextRoute, { peoplePage: () => nextPeoplePage }),
              Command.mapMessages(peopleCommands, childMessage =>
                GotPeopleMessage({ message: childMessage }),
              ),
            ]
          }),
          M.orElse(() => [modelWithNextRoute, []]),
        )
      },

      GotPeopleMessage: ({ message }) => {
        const [nextPeoplePage, peopleCommands] = People.update(
          model.peoplePage,
          message,
        )
        return [
          evo(model, { peoplePage: () => nextPeoplePage }),
          Command.mapMessages(peopleCommands, childMessage =>
            GotPeopleMessage({ message: childMessage }),
          ),
        ]
      },
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

const personView = (personId: number): Html => {
  const h = html<Message>()

  const person = People.findPerson(personId)

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
      People: () =>
        h.submodel({
          slotId: 'people',
          model: model.peoplePage,
          view: People.view,
          toParentMessage: message => GotPeopleMessage({ message }),
        }),
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
