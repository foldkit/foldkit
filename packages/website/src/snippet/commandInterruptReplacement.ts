import { Number } from 'effect'
import type { Update } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SearchState = defineTaggedUnion({
  Idle: {},
  Running: {},
  Cancelling: {},
})

type UpdateReturn = Update.Return<Model, Message>

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedQuery: ({ query }) =>
      SearchState.match<UpdateReturn>(model.searchState, {
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

    CompletedCancelFetchSuggestions: () => ({
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

    SucceededFetchSuggestions: ({ generation, suggestions }) => {
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
    FailedFetchSuggestions: ({ generation }) => {
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
