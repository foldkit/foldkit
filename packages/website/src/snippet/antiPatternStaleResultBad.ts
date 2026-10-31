// ❌ Bad: the result does not identify which search produced it.

import { Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { SuggestionApi } from './antiPatternSearchContract'

const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  SucceededSearch: { suggestions: Schema.Array(Schema.String) },
  FailedSearch: {},
})

const Search = Command.define('Search', {
  args: { query: Schema.String },
  messages: [Message.SucceededSearch, Message.FailedSearch],
})

export class Suggestions extends Block<Suggestions>()('Suggestions', {
  Model: Schema.Struct({
    query: Schema.String,
    suggestions: Schema.Array(Schema.String),
  }),
  Message,
  Command: [Search],
}) {}

export const SuggestionsLive = Suggestions.make(
  Effect.fn(function* () {
    const suggestionApi = yield* SuggestionApi

    return {
      model: { query: '', suggestions: [] },

      update: {
        UpdatedQuery: (model, { query }) => ({
          model: modifyFields(model, { query: () => query }),
          commands: [Search({ query })],
        }),
        SucceededSearch: (model, { suggestions }) => ({
          model: modifyFields(model, { suggestions: () => suggestions }),
        }),
        FailedSearch: model => ({ model }),
      },

      commands: {
        Search: ({ query }) =>
          suggestionApi.suggest(query).pipe(
            Effect.map(suggestions => Message.SucceededSearch({ suggestions })),
            Effect.catch(() => Effect.succeed(Message.FailedSearch())),
          ),
      },
    }
  }),
)
