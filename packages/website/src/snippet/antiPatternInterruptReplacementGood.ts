// ✅ Good: update returns FetchSuggestions after interruption.

import { Number } from 'effect'
import type { Update } from 'foldkit'

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedQuery: ({ query }) =>
      SearchState.match<UpdateReturn>(model.searchState, {
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

    CompletedCancelFetchSuggestions: () => ({
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
