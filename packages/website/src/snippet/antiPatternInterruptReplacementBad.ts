// ❌ Bad: interruption and replacement start independently.

import { Number } from 'effect'
import { Update } from 'foldkit'

const update = Update.make((model: Model, message: Message) =>
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
