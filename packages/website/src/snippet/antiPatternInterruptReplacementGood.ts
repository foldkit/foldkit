// ✅ Good: update returns FetchSuggestions after interruption.

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

export const SearchLive = Search.make(
  Effect.fn(function* () {
    const suggestionApi = yield* SuggestionApi

    return {
      model: {
        query: '',
        searchGeneration: 0,
        searchState: SearchState.Running(),
        suggestions: [],
      },

      update: {
        UpdatedQuery: (model, { query }) =>
          SearchState.match(model.searchState, {
            Running: () => ({
              model: modifyFields(model, {
                query: () => query,
                searchGeneration: Number.increment,
                searchState: () => SearchState.Cancelling(),
              }),
              commands: [
                FetchSuggestions.Interrupt(() =>
                  Message.CompletedCancelFetchSuggestions(),
                ),
              ],
            }),
            Cancelling: () => ({
              model: modifyFields(model, { query: () => query }),
            }),
          }),

        CompletedCancelFetchSuggestions: model => ({
          model: modifyFields(model, {
            searchState: () => SearchState.Running(),
          }),
          commands: [
            FetchSuggestions({
              query: model.query,
              generation: model.searchGeneration,
            }),
          ],
        }),

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
