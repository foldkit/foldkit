import { Context, Effect, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

export class SuggestionApi extends Context.Service<
  SuggestionApi,
  Readonly<{
    suggest: (query: string) => Effect.Effect<ReadonlyArray<string>, Error>
  }>
>()('SuggestionApi') {}

export const SearchState = defineTaggedUnion({
  Running: {},
  Cancelling: {},
})

export const Message = defineMessageUnion({
  UpdatedQuery: { query: Schema.String },
  CompletedCancelFetchSuggestions: {},
  SucceededFetchSuggestions: {
    generation: Schema.Number,
    suggestions: Schema.Array(Schema.String),
  },
  FailedFetchSuggestions: { generation: Schema.Number },
})

export const FetchSuggestions = Command.define('FetchSuggestions', {
  args: { query: Schema.String, generation: Schema.Number },
  messages: [Message.SucceededFetchSuggestions, Message.FailedFetchSuggestions],
  interrupt: true,
})

export class Search extends Block<Search>()('Search', {
  Model: Schema.Struct({
    query: Schema.String,
    searchGeneration: Schema.Number,
    searchState: SearchState,
    suggestions: Schema.Array(Schema.String),
  }),
  Message,
  Command: [FetchSuggestions],
}) {}

export const fetchSuggestions =
  (suggestionApi: SuggestionApi['Service']) =>
  ({ query, generation }: Readonly<{ query: string; generation: number }>) =>
    suggestionApi.suggest(query).pipe(
      Effect.map(suggestions =>
        Message.SucceededFetchSuggestions({ generation, suggestions }),
      ),
      Effect.catch(() =>
        Effect.succeed(Message.FailedFetchSuggestions({ generation })),
      ),
    )
