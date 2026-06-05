import {
  Array,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'
import { Command, Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { pushUrl } from 'foldkit/navigation'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { PeopleRoute, peopleRouter, personRouter } from '../route'

// DOMAIN

const Person = S.Struct({
  id: S.Number,
  name: S.String,
  role: S.String,
})
type Person = typeof Person.Type

const people: ReadonlyArray<Person> = [
  { id: 1, name: 'Alice Johnson', role: 'Designer' },
  { id: 2, name: 'Bob Smith', role: 'Developer' },
  { id: 3, name: 'Carol Davis', role: 'Manager' },
  { id: 4, name: 'David Wilson', role: 'Developer' },
  { id: 5, name: 'Eva Brown', role: 'Designer' },
]

const SEARCH_HISTORY_LIMIT = 5
const SEARCH_LATENCY = Duration.millis(300)

const matchesQuery = (person: Person, query: string): boolean => {
  const lowerQuery = query.toLowerCase()
  return (
    person.name.toLowerCase().includes(lowerQuery) ||
    person.role.toLowerCase().includes(lowerQuery)
  )
}

export const searchPeople = (searchText: string): ReadonlyArray<Person> =>
  pipe(
    searchText,
    Option.liftPredicate(String.isNonEmpty),
    Option.match({
      onNone: () => people,
      onSome: query =>
        Array.filter(people, person => matchesQuery(person, query)),
    }),
  )

const addSearchToHistory = (
  history: ReadonlyArray<string>,
  value: string,
): ReadonlyArray<string> => {
  if (String.isEmpty(value)) {
    return history
  }

  return Array.take(Array.dedupe([value, ...history]), SEARCH_HISTORY_LIMIT)
}

const routeSearchText = (route: PeopleRoute): string =>
  Option.getOrElse(route.searchText, () => '')

export const findPerson = (id: number) =>
  Array.findFirst(people, person => person.id === id)

// MODEL

export const SearchLoading = ts('SearchLoading')
export const SearchLoaded = ts('SearchLoaded', {
  query: S.String,
  people: S.Array(Person),
})

export const SearchResults = S.Union([SearchLoading, SearchLoaded])
export type SearchResults = typeof SearchResults.Type

export const Model = S.Struct({
  searchInput: S.String,
  searchHistory: S.Array(S.String),
  results: SearchResults,
})
export type Model = typeof Model.Type

// MESSAGE

export const ChangedSearchInput = m('ChangedSearchInput', { value: S.String })
export const SubmittedSearch = m('SubmittedSearch')
const ChangedRoute = m('ChangedRoute', { route: PeopleRoute })
export const SucceededFetchPeople = m('SucceededFetchPeople', {
  query: S.String,
  people: S.Array(Person),
})
export const CompletedPushSearchUrl = m('CompletedPushSearchUrl')

export const Message = S.Union([
  ChangedSearchInput,
  SubmittedSearch,
  ChangedRoute,
  SucceededFetchPeople,
  CompletedPushSearchUrl,
])
export type Message = typeof Message.Type

// INIT

export const init = (
  route: PeopleRoute,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] => {
  const searchText = routeSearchText(route)
  return [
    {
      searchInput: searchText,
      searchHistory: addSearchToHistory([], searchText),
      results: SearchLoading(),
    },
    [FetchPeople({ searchText })],
  ]
}

// COMMAND

export const PushSearchUrl = Command.define(
  'PushSearchUrl',
  { searchText: S.Option(S.String) },
  CompletedPushSearchUrl,
)(({ searchText }) =>
  pushUrl(peopleRouter({ searchText })).pipe(
    Effect.as(CompletedPushSearchUrl()),
  ),
)

export const FetchPeople = Command.define(
  'FetchPeople',
  { searchText: S.String },
  SucceededFetchPeople,
)(({ searchText }) =>
  Effect.sleep(SEARCH_LATENCY).pipe(
    Effect.as(
      SucceededFetchPeople({
        query: searchText,
        people: searchPeople(searchText),
      }),
    ),
  ),
)

// UPDATE

export type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ChangedSearchInput: ({ value }) => [
        evo(model, { searchInput: () => value }),
        [],
      ],

      SubmittedSearch: () => [
        model,
        [
          PushSearchUrl({
            searchText: Option.fromNullishOr(model.searchInput || null),
          }),
        ],
      ],

      ChangedRoute: ({ route }) => {
        const searchText = routeSearchText(route)
        return [
          evo(model, {
            searchInput: () => searchText,
            searchHistory: searchHistory =>
              addSearchToHistory(searchHistory, searchText),
            results: () => SearchLoading(),
          }),
          [FetchPeople({ searchText })],
        ]
      },

      SucceededFetchPeople: ({ query, people: fetchedPeople }) => [
        evo(model, {
          results: () => SearchLoaded({ query, people: fetchedPeople }),
        }),
        [],
      ],

      CompletedPushSearchUrl: () => [model, []],
    }),
  )

/** Tells the People page that the route changed. People does not own the
 *  route; it derives its own state (the search input and history) from the new
 *  route and returns the refetch Command. The parent calls this from its
 *  `ChangedUrl` handler. Contrast a `reflect*` setter, which writes a field the
 *  Submodel owns from an external value, with no derivation and no Command. */
export const informRouteChanged = (model: Model, route: PeopleRoute) =>
  update(model, ChangedRoute({ route }))

// VIEW

const statusText = (results: SearchResults): string =>
  M.value(results).pipe(
    M.withReturnType<string>(),
    M.tag('SearchLoading', () => 'Searching…'),
    M.tag('SearchLoaded', ({ query, people: found }) => {
      if (String.isEmpty(query)) {
        return 'Click on any person to view their details:'
      }

      const count = Array.length(found)
      const noun = count === 1 ? 'result' : 'results'
      return `${count} ${noun} for “${query}”`
    }),
    M.exhaustive,
  )

const recentSearchesView = (history: ReadonlyArray<string>): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-6 text-sm text-gray-600 flex flex-wrap gap-2')],
    [
      h.span([h.Class('font-medium')], ['Recent searches:']),
      ...Array.map(history, term =>
        h.keyed('span')(
          term,
          [h.Class('px-2 py-1 bg-gray-200 rounded font-mono text-gray-800')],
          [term],
        ),
      ),
    ],
  )
}

const personListItemView = (person: Person): Html => {
  const h = html<Message>()

  return h.keyed('li')(
    person.id.toString(),
    [h.Class('border border-gray-200 rounded-lg hover:bg-gray-50')],
    [
      h.a(
        [h.Href(personRouter({ personId: person.id })), h.Class('block p-4')],
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
  )
}

export const view = Submodel.defineView<Model, Message>((model): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),

      h.search(
        [h.Class('mb-6')],
        [
          h.form(
            [h.OnSubmit(SubmittedSearch()), h.Class('flex gap-2')],
            [
              Ui.Input.view({
                id: 'people-search',
                type: 'search',
                value: model.searchInput,
                placeholder: 'Search by name or role...',
                onInput: value => ChangedSearchInput({ value }),
                toView: ({ input, label, description }) =>
                  h.div(
                    [h.Class('flex-1')],
                    [
                      h.label(
                        [...label, h.Class('sr-only')],
                        ['Search people'],
                      ),
                      h.input([
                        ...input,
                        h.Autocomplete('off'),
                        h.Class(
                          'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                        ),
                      ]),
                      h.span([...description], []),
                    ],
                  ),
              }),
              Ui.Button.view<Message>({
                type: 'submit',
                toView: ({ button }) =>
                  h.button(
                    [
                      ...button,
                      h.Class(
                        'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition cursor-pointer',
                      ),
                    ],
                    ['Search'],
                  ),
              }),
            ],
          ),
        ],
      ),

      Array.match(model.searchHistory, {
        onEmpty: () => h.empty,
        onNonEmpty: recentSearchesView,
      }),

      h.p(
        [h.Class('text-lg text-gray-600 mb-6'), h.AriaLive('polite')],
        [statusText(model.results)],
      ),

      h.keyed('div')(
        model.results._tag,
        [],
        [
          M.value(model.results).pipe(
            M.tag('SearchLoading', () => h.empty),
            M.tag('SearchLoaded', ({ people: results }) =>
              h.ul(
                [h.Class('space-y-3')],
                Array.map(results, personListItemView),
              ),
            ),
            M.exhaustive,
          ),
        ],
      ),
    ],
  )
})
