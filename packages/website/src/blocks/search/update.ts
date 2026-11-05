import { Match, Number, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeNoopStep } from './block'
import { clearSearchQuery } from './clear'
import { FetchSearchResults, NavigateToResult, ScrollToResult } from './command'
import { SearchComposition } from './composition'
import { SearchState, resultsFromState } from './domain'

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

  CompletedFetchSearchResults: makeFieldsStep((model, { results, query }) => {
    if (query !== model.query) {
      return {}
    }

    return {
      searchState: () => SearchState.Ok({ results }),
      activeResultIndex: () => 0,
    }
  }),

  SelectedSearchResult: (model, { url }) => ({
    model: modifyFields(model, {
      query: () => '',
      searchState: () => SearchState.Idle(),
      activeResultIndex: () => -1,
    }),
    commands: [NavigateToResult({ url })],
  }),

  ClearedSearchQuery: clearSearchQuery,

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

  CompletedNavigateToResult: makeNoopStep(),
  CompletedScrollToResult: makeNoopStep(),
  CompletedFocusSearchInput: makeNoopStep(),
})
