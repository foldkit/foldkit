// ✅ Good: update returns FetchSuggestions after interruption.

import { Number } from 'effect'

const update = ApplicationComposition.makeUpdate({
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
})
