// ✅ Good: the result carries the generation that started the search.

import { Effect, Number, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { SuggestionApi } from './antiPatternSearchContract'

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  SucceededSearch: {
    generation: Schema.Number,
    suggestions: Schema.Array(Schema.String),
  },
  FailedSearch: { generation: Schema.Number },
})

const Search = Command.define('Search', {
  args: { query: Schema.String, generation: Schema.Number },
  messages: [Message.SucceededSearch, Message.FailedSearch],
})

export class Suggestions extends Block<Suggestions>()('Suggestions', {
  Model: Schema.Struct({
    query: Schema.String,
    searchGeneration: Schema.Number,
    suggestions: Schema.Array(Schema.String),
  }),
  Message,
  Command: [Search],
}) {}

export const SuggestionsLive = Suggestions.make(
  Effect.fn(function* () {
    const suggestionApi = yield* SuggestionApi

    return {
      model: { query: '', searchGeneration: 0, suggestions: [] },

      update: {
        UpdatedQuery: (model, { query }) => {
          const nextSearchGeneration = Number.increment(model.searchGeneration)

          return {
            model: modifyFields(model, {
              query: () => query,
              searchGeneration: () => nextSearchGeneration,
            }),
            commands: [Search({ query, generation: nextSearchGeneration })],
          }
        },
        SucceededSearch: (model, { generation, suggestions }) => {
          if (generation !== model.searchGeneration) {
            return { model }
          }

          return {
            model: modifyFields(model, { suggestions: () => suggestions }),
          }
        },
        FailedSearch: model => ({ model }),
      },

      commands: {
        Search: ({ query, generation }) =>
          suggestionApi.suggest(query).pipe(
            Effect.map(suggestions =>
              Message.SucceededSearch({ generation, suggestions }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.FailedSearch({ generation })),
            ),
          ),
      },
    }
  }),
)
