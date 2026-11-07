import {
  Array,
  Context,
  Effect,
  Layer,
  Queue,
  Result,
  Schema,
  Stream,
} from 'effect'

import * as Query from '../../experimental/query/public.js'
import { Block, Update } from '../../index.js'
import { defineMessageUnion } from '../../message/public.js'

export class RequestSource extends Context.Service<
  RequestSource,
  {
    execute: (key: string) => Effect.Effect<string, string>
  }
>()('QueryLifecycle/RequestSource') {}

export const Quotes = Query.define({
  name: 'Quotes',
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: true,
  handler: function* () {
    const source = yield* RequestSource
    return () => source.execute('quote')
  },
})

export const Windows = Query.define({
  name: 'Windows',
  args: { id: Schema.String },
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: true,
  handler: function* () {
    const source = yield* RequestSource
    return ({ id }) => source.execute(id)
  },
})

export const Model = Schema.Struct({
  quotes: Schema.Array(Quotes.Instance),
  windows: Windows.Model,
  accepted: Schema.Array(Schema.String),
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  CreatedQuote: { key: Schema.String },
  RemovedQuote: { key: Schema.String },
  ClickedLoadQuote: { key: Schema.String },
  ClickedResetQuote: { key: Schema.String },
  ClickedLoadWindow: { id: Schema.String },
  ClickedRestartWindow: { id: Schema.String },
  CompletedPublishSnapshot: {},
})
export type Message = typeof Message.Type

export const Snapshot = Schema.Struct({ tag: Schema.String, model: Model })
export type Snapshot = typeof Snapshot.Type
export class Observation extends Context.Service<
  Observation,
  {
    messages: Queue.Queue<Message>
    snapshots: Queue.Queue<Snapshot>
  }
>()('QueryLifecycle/Observation') {}

const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model,
  Message,
  effects: { services: [RequestSource, Observation] },
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const { makeFieldsStep, makeCommandsStep, makeNoopStep } = ApplicationBlock

const acceptedText = (source: string, result: Result.Result<string, string>) =>
  Result.match(result, {
    onSuccess: value => `${source}:success:${value}`,
    onFailure: error => `${source}:failure:${error}`,
  })

const foldQuotesOutMessage = ApplicationBlock.makeOutMessageFold(Quotes, {
  CompletedFetch: ({ result }) =>
    makeFieldsStep(() => ({
      accepted: Array.append(acceptedText('quote', result)),
    })),
})
const QuotesBinding = ApplicationBlock.makeKeyedArrayBinding(Quotes, {
  field: 'quotes',
  key: 'key',
  childField: 'model',
}).withOutMessagePolicy({
  fold: (_key, outMessage) => foldQuotesOutMessage(outMessage),
})
const WindowsBinding = ApplicationBlock.makeRequiredFieldBinding(Windows, {
  field: 'windows',
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(Windows, {
    CompletedFetch: ({ args, result }) =>
      makeFieldsStep(() => ({
        accepted: Array.append(acceptedText(args.id, result)),
      })),
  }),
})
const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [QuotesBinding, WindowsBinding],
})

const PublishSnapshot = ApplicationBlock.makeCommand('PublishSnapshot', {
  args: { tag: Schema.String, model: Model },
  messages: [Message.CompletedPublishSnapshot],
  handler: function* () {
    const observation = yield* Observation
    return snapshot =>
      Queue.offer(observation.snapshots, snapshot).pipe(
        Effect.as(Message.CompletedPublishSnapshot()),
      )
  },
})
const subscriptions = ApplicationBlock.makeSubscriptions(entry => ({
  input: entry('ObserveInput', {
    messages: [
      Message.CreatedQuote,
      Message.RemovedQuote,
      Message.ClickedLoadQuote,
      Message.ClickedResetQuote,
      Message.ClickedLoadWindow,
      Message.ClickedRestartWindow,
      Message.CompletedPublishSnapshot,
    ],
    handler: function* () {
      const observation = yield* Observation
      return () => Stream.fromQueue(observation.messages)
    },
  }),
}))
const init = ApplicationComposition.makeInit(() => ({
  model: { quotes: [], accepted: [] },
  steps: [makeCommandsStep(model => [PublishSnapshot({ tag: 'Init', model })])],
}))
const update = ApplicationComposition.makeUpdate.compose(
  ApplicationComposition.makeUpdate({
    CreatedQuote: makeFieldsStep((_model, { key }) => ({
      quotes: Array.append(QuotesBinding.create({ key, args: [] })),
    })),
    RemovedQuote: makeFieldsStep((_model, { key }) => ({
      quotes: Array.filter(quote => quote.key !== key),
    })),
    ClickedLoadQuote: (model, { key }) =>
      QuotesBinding.requestRevalidationOrLoad(key)(model),
    ClickedResetQuote: (model, { key }) =>
      QuotesBinding.requestReset(key)(model),
    ClickedLoadWindow: (model, { id }) =>
      WindowsBinding.requestRevalidationOrLoad({ id })(model),
    ClickedRestartWindow: (model, { id }) =>
      Update.combineSteps(model, [
        WindowsBinding.requestCancel({ id }),
        WindowsBinding.requestRevalidationOrLoad({ id }),
      ]),
    CompletedPublishSnapshot: makeNoopStep(),
  }),
  ApplicationComposition.makeUpdate.except(['CompletedPublishSnapshot'])(
    (model, message) => ({
      model,
      commands: [PublishSnapshot({ tag: message._tag, model })],
    }),
  ),
)
export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const quotes = yield* QuotesBinding
    const windows = yield* WindowsBinding

    return {
      children: [quotes, windows],
      init,
      update,
      view: ApplicationComposition.makeView((model, h) =>
        h.div([], model.accepted),
      ),
      subscriptions,
      EffectsLayer: Layer.merge(PublishSnapshot.layer, subscriptions.layer),
    }
  }),
).pipe(Layer.provide(Query.layer))
