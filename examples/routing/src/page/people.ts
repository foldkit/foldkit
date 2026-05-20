import { Array, Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Command } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { replaceUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { PeopleRoute, peopleRouter, personRouter } from '../route'

// DOMAIN

const people = [
  { id: 1, name: 'Alice Johnson', role: 'Designer' },
  { id: 2, name: 'Bob Smith', role: 'Developer' },
  { id: 3, name: 'Carol Davis', role: 'Manager' },
  { id: 4, name: 'David Wilson', role: 'Developer' },
  { id: 5, name: 'Eva Brown', role: 'Designer' },
]

const SEARCH_HISTORY_LIMIT = 5

const addSearchToHistory = (
  history: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  if (value === '') {
    return history
  }

  const maybeHead = Array.head(history)
  return Option.match(maybeHead, {
    onNone: () => [value],
    onSome: head =>
      head === value
        ? history
        : Array.take([value, ...history], SEARCH_HISTORY_LIMIT),
  })
}

// MODEL

export const Model = S.Struct({
  searchInput: S.String,
  searchHistory: S.Array(S.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const CompletedReplaceUrl = m('CompletedReplaceUrl')
export const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })
export const ChangedRoute = m('ChangedRoute', { route: PeopleRoute })

export const Message = S.Union([
  CompletedReplaceUrl,
  ChangedSearchInput,
  ChangedRoute,
])
export type Message = typeof Message.Type

// INIT

const routeSearchText = (route: PeopleRoute): string =>
  Option.getOrElse(route.searchText, () => '')

export const init = (
  route: PeopleRoute,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const initialSearch = routeSearchText(route)
  return [
    {
      searchInput: initialSearch,
      searchHistory: addSearchToHistory([], initialSearch),
    },
    [],
  ]
}

// COMMAND

export const ReplaceSearchUrl = Command.define(
  'ReplaceSearchUrl',
  { searchText: S.Option(S.String) },
  CompletedReplaceUrl,
)(({ searchText }) =>
  replaceUrl(peopleRouter({ searchText })).pipe(
    Effect.as(CompletedReplaceUrl()),
  ),
)

// UPDATE

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      CompletedReplaceUrl: () => [model, []],

      ChangedSearchInput: ({ value }) => [
        evo(model, {
          searchInput: () => value,
        }),
        [
          ReplaceSearchUrl({
            searchText: Option.fromNullishOr(value || null),
          }),
        ],
      ],

      ChangedRoute: ({ route }) => {
        const incomingSearch = routeSearchText(route)
        return [
          evo(model, {
            searchInput: () => incomingSearch,
            searchHistory: () =>
              addSearchToHistory(model.searchHistory, incomingSearch),
          }),
          [],
        ]
      },
    }),
  )

// VIEW

export const view = <ParentMessage>(
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const filteredPeople = pipe(
    model.searchInput,
    Option.liftPredicate(query => query !== ''),
    Option.match({
      onNone: () => people,
      onSome: query =>
        Array.filter(
          people,
          person =>
            person.name.toLowerCase().includes(query.toLowerCase()) ||
            person.role.toLowerCase().includes(query.toLowerCase()),
        ),
    }),
  )

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),

      h.search(
        [h.Class('mb-6')],
        [
          h.input([
            h.Value(model.searchInput),
            h.Placeholder('Search by name or role...'),
            h.Class(
              'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
            h.OnInput(value => toParentMessage(ChangedSearchInput({ value }))),
          ]),
        ],
      ),

      Array.match(model.searchHistory, {
        onEmpty: () => h.empty,
        onNonEmpty: history =>
          h.div(
            [h.Class('mb-6 text-sm text-gray-600 flex flex-wrap gap-2')],
            [
              h.span([h.Class('font-medium')], ['Recent searches:']),
              ...Array.map(history, term =>
                h.span(
                  [
                    h.Class(
                      'px-2 py-1 bg-gray-200 rounded font-mono text-gray-800',
                    ),
                  ],
                  [term],
                ),
              ),
            ],
          ),
      }),

      h.p(
        [h.Class('text-lg text-gray-600 mb-6')],
        [
          model.searchInput === ''
            ? 'Click on any person to view their details:'
            : `Searching for "${model.searchInput}" - ${Array.length(filteredPeople)} results:`,
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

export const findPerson = (id: number) =>
  Array.findFirst(people, person => person.id === id)
