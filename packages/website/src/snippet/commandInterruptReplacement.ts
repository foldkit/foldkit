import { Number } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SearchState = defineTaggedUnion({
  Idle: {},
  Running: {},
  Cancelling: {},
})
type SearchState = typeof SearchState.Type

const update = SearchComposition.makeUpdate({
  UpdatedQuery: (model, { query }) =>
    SearchState.match(model.searchState, {
      Idle: () => {
        const nextGeneration = Number.increment(model.generation)

        return {
          model: modifyFields(model, {
            query: () => query,
            generation: () => nextGeneration,
            searchState: () => SearchState.Running(),
          }),
          commands: [FetchSuggestions({ query, generation: nextGeneration })],
        }
      },
      Running: () => ({
        model: modifyFields(model, {
          query: () => query,
          generation: Number.increment,
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
        generation: model.generation,
      }),
    ],
  }),

  SucceededFetchSuggestions: (model, { generation, suggestions }) => {
    if (generation !== model.generation) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        searchState: () => SearchState.Idle(),
        suggestions: () => suggestions,
      }),
    }
  },
  FailedFetchSuggestions: (model, { generation }) => {
    if (generation !== model.generation) {
      return { model }
    }

    return {
      model: modifyFields(model, {
        searchState: () => SearchState.Idle(),
      }),
    }
  },
})
