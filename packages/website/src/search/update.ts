import { Array, Effect, Match, Number, Schema, String } from 'effect'
import { Update } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { pushUrl } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'

import { PagefindService } from '../pagefind'
import { SEARCH_INPUT_ID } from '../searchDom'
import { clearSearchQuery } from './clear'
import { DialogBinding, SearchComposition } from './composition'
import { SearchDefinition } from './definition'
import { SearchResult, SearchState, resultsFromState } from './domain'
import { Message } from './message'

const MAX_RESULTS = 8

const SEARCH_RESULT_SELECTOR = '[data-search-result-index='

export const FetchSearchResults = SearchDefinition.makeCommand(
  'FetchSearchResults',
  {
    args: { query: Schema.String },
    messages: [Message.CompletedFetchSearchResults],
    handler: function* () {
      const pagefind = yield* PagefindService

      return ({ query }) =>
        Effect.gen(function* () {
          const searchResponse = yield* Effect.tryPromise({
            try: () => pagefind.search(query),
            catch: () => new Error('Pagefind search failed'),
          })

          const topResults = Array.take(searchResponse.results, MAX_RESULTS)

          const loadedResults = yield* Effect.tryPromise({
            try: () => Promise.all(topResults.map(result => result.data())),
            catch: () => new Error('Failed to load result data'),
          })

          const results = Array.map(loadedResults, data =>
            SearchResult.make({
              url: data.url,
              title: data.meta?.title ?? 'Untitled',
              excerpt: data.excerpt,
              section: data.meta?.section ?? '',
              kind: data.meta?.kind ?? '',
            }),
          )

          return Message.CompletedFetchSearchResults({ results, query })
        }).pipe(
          Effect.catch(() =>
            Effect.succeed(
              Message.CompletedFetchSearchResults({ results: [], query }),
            ),
          ),
        )
    },
  },
)

export const ScrollToResult = SearchDefinition.makeCommand('ScrollToResult', {
  args: { index: Schema.Number },
  messages: [Message.CompletedScrollToResult],
  handler: function* () {
    return ({ index }) =>
      Dom.scrollIntoView(`${SEARCH_RESULT_SELECTOR}"${index}"]`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedScrollToResult()),
      )
  },
})

export const NavigateToResult = SearchDefinition.makeCommand(
  'NavigateToResult',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedNavigateToResult],
    handler: function* () {
      return ({ url }) =>
        pushUrl(url).pipe(Effect.as(Message.CompletedNavigateToResult()))
    },
  },
)

export const FocusSearchInput = SearchDefinition.makeCommand(
  'FocusSearchInput',
  {
    messages: [Message.CompletedFocusSearchInput],
    handler: function* () {
      return () =>
        Dom.focus(`#${SEARCH_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusSearchInput()),
        )
    },
  },
)

const focusSearchInput = SearchDefinition.makeCommandsStep(() => [
  FocusSearchInput(),
])

const open = SearchDefinition.makeStep(() =>
  Update.combineSteps([DialogBinding.requestOpen(), focusSearchInput]),
)

export const update = SearchComposition.makeUpdate({
  UpdatedSearchQuery: (model, { query }) => {
    if (query === model.query) {
      return { model }
    }

    if (String.isEmpty(query)) {
      return {
        model: modifyFields(model, {
          query: () => '',
          searchState: () => SearchState.Idle(),
          activeResultIndex: () => -1,
        }),
      }
    }

    const previousResults = resultsFromState(model.searchState)

    return {
      model: modifyFields(model, {
        query: () => query,
        searchState: () => SearchState.Loading({ results: previousResults }),
        activeResultIndex: () => -1,
      }),
      commands: [FetchSearchResults({ query })],
    }
  },

  CompletedFetchSearchResults: SearchDefinition.makeFieldsStep(
    (model, { results, query }) => {
      if (query !== model.query) {
        return {}
      }

      return {
        searchState: () => SearchState.Ok({ results }),
        activeResultIndex: () => 0,
      }
    },
  ),

  SelectedSearchResult: (model, { url }) => ({
    model: modifyFields(model, {
      query: () => '',
      searchState: () => SearchState.Idle(),
      activeResultIndex: () => -1,
    }),
    commands: [NavigateToResult({ url })],
  }),

  ClearedSearchQuery: clearSearchQuery,

  RequestedOpen: open,

  InformedOfRouteChange: Update.combineSteps([
    clearSearchQuery,
    DialogBinding.requestClose(),
  ]),

  PressedArrowKey: (model, { direction }) => {
    const results = resultsFromState(model.searchState)
    const lastIndex = results.length - 1

    const nextIndex = Match.value(direction).pipe(
      Match.when('Up', () =>
        model.activeResultIndex <= 0
          ? lastIndex
          : Number.decrement(model.activeResultIndex),
      ),
      Match.when('Down', () =>
        model.activeResultIndex >= lastIndex
          ? 0
          : Number.increment(model.activeResultIndex),
      ),
      Match.exhaustive,
    )

    return {
      model: modifyFields(model, { activeResultIndex: () => nextIndex }),
      commands: [ScrollToResult({ index: nextIndex })],
    }
  },

  CompletedNavigateToResult: SearchDefinition.makeNoopStep(),
  CompletedScrollToResult: SearchDefinition.makeNoopStep(),
  CompletedFocusSearchInput: SearchDefinition.makeNoopStep(),
})
