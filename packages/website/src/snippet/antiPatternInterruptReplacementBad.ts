// ❌ Bad: interruption and replacement start independently.

import { Effect, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'

import {
  FetchSuggestions,
  Message,
  Search,
  SearchState,
  SuggestionApi,
  fetchSuggestions,
} from './antiPatternSearchContract'

export const SearchLive = Search.toLayer(
  Effect.gen(function* () {
    const suggestionApi = yield* SuggestionApi

    return {
      init: () => ({
        query: '',
        searchGeneration: 0,
        searchState: SearchState.Running(),
        suggestions: [],
      }),

      update: {
        UpdatedQuery: (model, { query }) => {
          const nextSearchGeneration = Number.increment(model.searchGeneration)

          return {
            model: modifyFields(model, {
              query: () => query,
              searchGeneration: () => nextSearchGeneration,
            }),
            commands: [
              FetchSuggestions.Interrupt(() =>
                Message.CompletedCancelFetchSuggestions(),
              ),
              FetchSuggestions({ query, generation: nextSearchGeneration }),
            ],
          }
        },

        CompletedCancelFetchSuggestions: model => ({ model }),

        SucceededFetchSuggestions: (model, { generation, suggestions }) => {
          if (generation !== model.searchGeneration) {
            return { model }
          }

          return {
            model: modifyFields(model, { suggestions: () => suggestions }),
          }
        },

        FailedFetchSuggestions: model => ({ model }),
      },

      commands: { FetchSuggestions: fetchSuggestions(suggestionApi) },
    }
  }),
)
