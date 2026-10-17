// ❌ Bad: interruption and replacement start independently.

import { Number } from 'effect'

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedQuery: ({ query }) => {
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
  }),
)
