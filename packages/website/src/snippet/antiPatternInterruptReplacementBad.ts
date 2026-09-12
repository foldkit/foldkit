// ❌ Bad: interruption and replacement start independently.

import { Number } from 'effect'

const handlers = {
  UpdatedQuery: ({ query }) => {
    const nextSearchGeneration = Number.increment(model.searchGeneration)

    return {
      model: evo(model, {
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
}
