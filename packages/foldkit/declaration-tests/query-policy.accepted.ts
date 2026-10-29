import { Context, Effect, Option, Result, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import { defineMessageUnion } from 'foldkit/message'

export const WindowArgs = Schema.Struct({
  label: Schema.String,
  offset: Schema.Number,
  limit: Schema.Number,
})
export type WindowArgs = typeof WindowArgs.Type

export class QuoteProvider extends Context.Service<
  QuoteProvider,
  Readonly<{
    fetch: (args: WindowArgs) => Effect.Effect<ReadonlyArray<string>, string>
  }>
>()('QueryPolicyQuoteProvider') {}
export class QuoteCredentials extends Context.Service<
  QuoteCredentials,
  Readonly<{ isAvailable: boolean }>
>()('QueryPolicyQuoteCredentials') {}
export class MissingCredentials extends Error {}

export const QuoteWindows = Query.define({
  name: 'QuoteWindows',
  args: WindowArgs.fields,
  data: Schema.Array(Schema.String),
  error: Schema.String,
  staleTime: '1 minute',
  maxSettledEntries: 100,
  notifyOnCompletion: true,
  handler: function* () {
    const credentials = yield* QuoteCredentials

    if (!credentials.isAvailable) {
      return yield* Effect.fail(new MissingCredentials())
    }

    return args =>
      Effect.flatMap(QuoteProvider, provider => provider.fetch(args))
  },
})

export const HostWindows = Query.define({
  name: 'HostWindows',
  args: WindowArgs.fields,
  data: Schema.Array(Schema.String),
  error: Schema.String,
  notifyOnCompletion: true,
})
export const HostWindowsLayer = HostWindows.toLayer(
  Effect.succeed(args => Effect.succeed([args.label])),
)
export const ProvidedWindows = HostWindows.provideHandlers(HostWindowsLayer)
export const PlainWindows = Query.define({
  name: 'PlainWindows',
  args: WindowArgs.fields,
  data: Schema.Array(Schema.String),
  error: Schema.String,
})
export const Ordinary = Query.define({
  name: 'OrdinaryPolicy',
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: true,
  staleTime: '30 seconds',
})

export const ParentModel = Schema.Struct({
  quotes: QuoteWindows.Model,
  acceptedCount: Schema.Number,
  maybeNextWindow: Schema.Option(WindowArgs),
})
export type ParentModel = typeof ParentModel.Type
export const ParentMessage = defineMessageUnion({
  RequestedWindow: { args: WindowArgs, nowMillis: Schema.Number },
  CanceledWindow: { args: WindowArgs },
})
export const ParentDefinition = Block.makeDefinition('QueryPolicyParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const QuotesBinding = ParentDefinition.makeBinding(QuoteWindows, {
  field: 'quotes',
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(QuoteWindows, {
    CompletedFetch: ({ args, result }) =>
      ParentDefinition.makeFieldsStep(() => ({
        acceptedCount: count => count + 1,
        maybeNextWindow: () =>
          Result.isSuccess(result)
            ? Option.some({ ...args, offset: args.offset + args.limit })
            : Option.none(),
      })),
  }),
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [QuotesBinding],
})
export const parentInit = ParentComposition.makeInit(() => ({
  model: { acceptedCount: 0, maybeNextWindow: Option.none() },
  steps: [
    QuotesBinding.requestLoadIfStale(
      { label: 'devin', offset: 0, limit: 60 },
      0,
    ),
  ],
}))
export const parentUpdate = ParentComposition.makeUpdate({
  RequestedWindow: (model, { args, nowMillis }) =>
    QuotesBinding.requestLoadIfStale(args, nowMillis)(model),
  CanceledWindow: (model, { args }) => QuotesBinding.requestCancel(args)(model),
})

const PlainParent = Block.makeDefinition('PlainQueryPolicyParent', {
  Model: Schema.Struct({ quotes: PlainWindows.Model }),
  Message: Schema.Never,
})
export const PlainBinding = PlainParent.makeBinding(PlainWindows, {
  field: 'quotes',
})
export const PlainComposition = PlainParent.makeComposition({
  bindings: [PlainBinding],
})
