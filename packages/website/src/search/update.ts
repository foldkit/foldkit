import { Match, Number, String } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { FetchSearchResults, NavigateToResult, ScrollToResult } from './command'
import { SearchState, resultsFromState } from './domain'
import type { Message } from './message'
import type { Model } from './model'

type UpdatedSearchQuery = typeof Message.UpdatedSearchQuery.Type
type CompletedFetchSearchResults =
  typeof Message.CompletedFetchSearchResults.Type
type PressedArrowKey = typeof Message.PressedArrowKey.Type

export const handleUpdatedSearchQuery = (
  model: Model,
  { query }: UpdatedSearchQuery,
) => {
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
}

export const handleCompletedFetchSearchResults = (
  model: Model,
  { results, query }: CompletedFetchSearchResults,
) => {
  if (query !== model.query) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      searchState: () => SearchState.Ok({ results }),
      activeResultIndex: () => 0,
    }),
  }
}

export const handleSelectedSearchResult = (
  model: Model,
  { url }: Readonly<{ url: string }>,
) => ({
  model: modifyFields(model, {
    query: () => '',
    searchState: () => SearchState.Idle(),
    activeResultIndex: () => -1,
  }),
  commands: [NavigateToResult({ url })],
})

export const handlePressedArrowKey = (
  model: Model,
  { direction }: PressedArrowKey,
) => {
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
}
