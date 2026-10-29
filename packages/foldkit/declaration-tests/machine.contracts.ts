import { Context, Effect, Option, Schema } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

export const Domain = Schema.Struct({
  name: Schema.String,
  price: Schema.Number,
})
export const QuoteWindow = Schema.Struct({
  offset: Schema.Number,
  limit: Schema.Number,
})
export const CachedQuotes = Schema.Struct({
  ...QuoteWindow.fields,
  domains: Schema.Array(Domain),
})
export const SearchContext = Schema.Struct({
  query: Schema.String,
  searchGeneration: Schema.Number,
  maybeCachedQuotes: Schema.Option(CachedQuotes),
})
export const QuoteRequest = defineTaggedUnion({
  Idle: {},
  Loading: QuoteWindow.fields,
  Failed: { ...QuoteWindow.fields, error: Schema.String },
})
export const SearchState = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Ready: {
    domains: Schema.Array(Domain),
    quoteRequest: QuoteRequest.pipe(
      Schema.withConstructorDefault(Effect.succeed(QuoteRequest.Idle())),
    ),
  },
  Failed: { error: Schema.String },
})
export const Message = defineMessageUnion({
  RequestedSearch: {},
  RequestedQuotes: QuoteWindow.fields,
  ClickedRetrySearch: {},
  SucceededFetchQuotes: {
    ...QuoteWindow.fields,
    searchGeneration: Schema.Number,
    domains: Schema.Array(Domain),
  },
  FailedFetchQuotes: { searchGeneration: Schema.Number, error: Schema.String },
  CompletedCancelSearch: {},
  CompletedTrackSearch: {},
})

export class QuotesClient extends Context.Service<
  QuotesClient,
  {
    readonly fetch: (
      label: string,
      offset: number,
      limit: number,
    ) => Effect.Effect<ReadonlyArray<typeof Domain.Type>, string>
  }
>()('MachineFixture/QuotesClient') {}

export class SearchAudit extends Context.Service<
  SearchAudit,
  {
    readonly record: (query: string) => Effect.Effect<void>
  }
>()('MachineFixture/SearchAudit') {}

export const FetchQuotes = Command.define('MachineFixture/FetchQuotes', {
  args: {
    label: Schema.String,
    ...QuoteWindow.fields,
    searchGeneration: Schema.Number,
  },
  messages: [Message.SucceededFetchQuotes, Message.FailedFetchQuotes],
  handler: function* () {
    const client = yield* QuotesClient
    return ({ label, offset, limit, searchGeneration }) =>
      client.fetch(label, offset, limit).pipe(
        Effect.map(domains =>
          Message.SucceededFetchQuotes({
            domains,
            offset,
            limit,
            searchGeneration,
          }),
        ),
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedFetchQuotes({ error, searchGeneration }),
          ),
        ),
      )
  },
})

export const TrackSearch = Command.define('MachineFixture/TrackSearch', {
  args: { query: Schema.String },
  messages: [Message.CompletedTrackSearch],
  handler: function* () {
    const audit = yield* SearchAudit
    return ({ query }) =>
      audit.record(query).pipe(Effect.as(Message.CompletedTrackSearch()))
  },
})

export const CancelSearch = Command.define('MachineFixture/CancelSearch', {
  messages: [Message.CompletedCancelSearch],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedCancelSearch())
  },
})

export const queryToMaybeLabel = (query: string): Option.Option<string> =>
  Option.liftPredicate((value: string) => /^[a-z0-9-]+$/.test(value))(query)
