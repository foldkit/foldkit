// ✅ Good: update returns FetchSuggestions after interruption.

import { Number } from 'effect'
import type { Update } from 'foldkit'

type UpdateReturn = Update.Return<Model, Message>

const handlers = {
  UpdatedQuery: ({ query }) =>
    SearchState.match<UpdateReturn>(model.searchState, {
      Running: () => ({
        model: evo(model, {
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
        model: evo(model, { query: () => query }),
      }),
    }),

  CompletedCancelFetchSuggestions: () => ({
    model: evo(model, {
      searchState: () => SearchState.Running(),
    }),
    commands: [
      FetchSuggestions({
        query: model.query,
        generation: model.searchGeneration,
      }),
    ],
  }),
}
