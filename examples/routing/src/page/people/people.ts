import { Array, Duration, Effect, Option, Schema, String } from 'effect'
import { Block, Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { pushUrl } from 'foldkit/navigation'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import { Person, searchPeople } from '../../domain/person'
import {
  ApplicationRoute,
  type PeopleRoute,
  peopleRouter,
  personRouter,
} from '../../route'

const SEARCH_HISTORY_LIMIT = 5
const SEARCH_LATENCY = Duration.millis(300)

export const SearchResults = defineTaggedUnion({
  Loading: {},
  Loaded: { query: Schema.String, people: Schema.Array(Person) },
})
export type SearchResults = typeof SearchResults.Type

export const Model = Schema.Struct({
  searchInput: Schema.String,
  searchHistory: Schema.Array(Schema.String),
  results: SearchResults,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedSearchInput: { value: Schema.String },
  SubmittedSearch: {},
  InformedOfRouteChange: { route: ApplicationRoute.People },
  CompletedFetchPeople: {
    query: Schema.String,
    people: Schema.Array(Person),
  },
  CompletedPushSearchUrl: {},
})
export type Message = typeof Message.Type

export const PushSearchUrl = Command.define('PushSearchUrl', {
  args: { searchText: Schema.Option(Schema.String) },
  messages: [Message.CompletedPushSearchUrl],
})

export const FetchPeople = Command.define('FetchPeople', {
  args: { searchText: Schema.String },
  messages: [Message.CompletedFetchPeople],
})

export class People extends Block<People, Readonly<{ route: PeopleRoute }>>()(
  'People',
  {
    Model,
    Message,
    Command: [PushSearchUrl, FetchPeople],
  },
) {}

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

type PeopleViewBuilder = HtmlBuilder<Message>

const statusText = (results: SearchResults): string =>
  SearchResults.match<string>(results, {
    Loading: () => 'Searching…',
    Loaded: ({ query, people: found }) => {
      if (String.isEmpty(query)) {
        return 'Click on any person to view their details:'
      }

      const count = Array.length(found)
      const noun = count === 1 ? 'result' : 'results'
      return `${count} ${noun} for “${query}”`
    },
  })

const recentSearchesView = (
  history: ReadonlyArray<string>,
  h: PeopleViewBuilder,
): Html =>
  h.div(
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

const personListItemView = (person: Person, h: PeopleViewBuilder): Html =>
  h.keyed('li')(
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

const view = (model: Model, h: PeopleViewBuilder): Html =>
  h.div(
    [h.Class('max-w-4xl mx-auto px-4')],
    [
      h.h1([h.Class('text-4xl font-bold text-gray-800 mb-6')], ['People']),

      h.search(
        [h.Class('mb-6')],
        [
          h.form(
            [h.OnSubmit(Message.SubmittedSearch()), h.Class('flex gap-2')],
            [
              Input.view(
                {
                  id: 'people-search',
                  type: 'search',
                  value: model.searchInput,
                  placeholder: 'Search by name or role...',
                  onInput: value => Message.ChangedSearchInput({ value }),
                  toView: ({ input, label }) =>
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
                      ],
                    ),
                },
                h,
              ),
              Button.view(
                {
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
                },
                h,
              ),
            ],
          ),
        ],
      ),

      Array.match(model.searchHistory, {
        onEmpty: () => h.empty,
        onNonEmpty: history => recentSearchesView(history, h),
      }),

      h.p(
        [h.Class('text-lg text-gray-600 mb-6'), h.AriaLive('polite')],
        [statusText(model.results)],
      ),

      SearchResults.match(model.results, {
        Loading: () => h.empty,
        Loaded: ({ people: results }) =>
          h.ul(
            [h.Class('space-y-3')],
            Array.map(results, person => personListItemView(person, h)),
          ),
      }),
    ],
  )

export const PeopleLive = People.make(
  Effect.fn(function* (_id, { route }) {
    const searchText = routeSearchText(route)

    return {
      model: {
        searchInput: searchText,
        searchHistory: addSearchToHistory([], searchText),
        results: SearchResults.Loading(),
      },

      start: [FetchPeople({ searchText })],

      update: {
        ChangedSearchInput: (model, { value }) => ({
          model: modifyFields(model, { searchInput: () => value }),
        }),

        SubmittedSearch: model => ({
          model,
          commands: [
            PushSearchUrl({
              searchText: Option.fromNullishOr(model.searchInput || null),
            }),
          ],
        }),

        InformedOfRouteChange: (model, { route: nextRoute }) => {
          const nextSearchText = routeSearchText(nextRoute)
          return {
            model: modifyFields(model, {
              searchInput: () => nextSearchText,
              searchHistory: searchHistory =>
                addSearchToHistory(searchHistory, nextSearchText),
              results: () => SearchResults.Loading(),
            }),
            commands: [FetchPeople({ searchText: nextSearchText })],
          }
        },

        CompletedFetchPeople: (model, { query, people: fetchedPeople }) => ({
          model: modifyFields(model, {
            results: () =>
              SearchResults.Loaded({ query, people: fetchedPeople }),
          }),
        }),

        CompletedPushSearchUrl: model => ({ model }),
      },

      commands: {
        PushSearchUrl: ({ searchText: maybeSearchText }) =>
          pushUrl(peopleRouter({ searchText: maybeSearchText })).pipe(
            Effect.as(Message.CompletedPushSearchUrl()),
          ),
        FetchPeople: ({ searchText: query }) =>
          Effect.sleep(SEARCH_LATENCY).pipe(
            Effect.as(
              Message.CompletedFetchPeople({
                query,
                people: searchPeople(query),
              }),
            ),
          ),
      },

      view,
    }
  }),
)
