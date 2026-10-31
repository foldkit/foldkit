import { Context, Effect, Number, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

class SuggestionApi extends Context.Service<
  SuggestionApi,
  Readonly<{
    suggest: (query: string) => Effect.Effect<ReadonlyArray<string>, Error>
  }>
>()('SuggestionApi') {}

const SearchState = defineTaggedUnion({
  Idle: {},
  Running: {},
  Cancelling: {},
})

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  CompletedCancelFetchSuggestions: {},
  SucceededFetchSuggestions: {
    generation: Schema.Number,
    suggestions: Schema.Array(Schema.String),
  },
  FailedFetchSuggestions: { generation: Schema.Number },
})

const FetchSuggestions = Command.define('FetchSuggestions', {
  args: { query: Schema.String, generation: Schema.Number },
  messages: [Message.SucceededFetchSuggestions, Message.FailedFetchSuggestions],
  interrupt: true,
})

export class Search extends Block<Search>()('Search', {
  Model: Schema.Struct({
    query: Schema.String,
    generation: Schema.Number,
    searchState: SearchState,
    suggestions: Schema.Array(Schema.String),
  }),
  Message,
  Command: [FetchSuggestions],
}) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    const suggestionApi = yield* SuggestionApi

    return {
      model: {
        query: '',
        generation: 0,
        searchState: SearchState.Idle(),
        suggestions: [],
      },

      update: {
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
                commands: [
                  FetchSuggestions({ query, generation: nextGeneration }),
                ],
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
      },

      commands: {
        FetchSuggestions: ({ query, generation }) =>
          suggestionApi.suggest(query).pipe(
            Effect.map(suggestions =>
              Message.SucceededFetchSuggestions({ generation, suggestions }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.FailedFetchSuggestions({ generation })),
            ),
          ),
      },
    }
  }),
)
