import { Context, Effect, Layer, Schema, Stream } from 'effect'

import { makeDefinition } from '../../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../../message/index.js'

export class CounterSource extends Context.Service<
  CounterSource,
  Readonly<{
    read: (count: number) => Effect.Effect<number>
    changes: Stream.Stream<number>
  }>
>()('ChildInstances/CounterSource') {}

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
export const Message = defineMessageUnion({
  CompletedReadCount: { count: Schema.Number },
  ReceivedCount: { count: Schema.Number },
})
type Message = typeof Message.Type
const InMessage = defineInMessageUnion({ RequestedIncrement: {} })
type InMessage = typeof InMessage.Type
const OutMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
type OutMessage = typeof OutMessage.Type
export const CounterKey = Symbol('OccurrenceCounter')
const CounterDefinition = makeDefinition('OccurrenceCounter', {
  key: CounterKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Schema.Number]),
  effects: { services: [CounterSource] },
  inMessageOutputs: {
    RequestedIncrement: { outMessage: OutMessage.ChangedCount },
  },
  view: { kind: 'Element' },
})
export const CounterBlock = CounterDefinition.contract
const { makeFieldsStep } = CounterDefinition
const CounterComposition = CounterDefinition.makeComposition()
export const initializationCounts: Array<number> = []
export const ReadCount = CounterDefinition.makeCommand('ReadCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedReadCount],
  handler: function* () {
    const source = yield* CounterSource

    return ({ count }) =>
      source
        .read(count)
        .pipe(Effect.map(count => Message.CompletedReadCount({ count })))
  },
})
const init = CounterComposition.makeInit(count => {
  initializationCounts.push(count)

  return { model: { count }, commands: [ReadCount({ count })] }
})
const update = CounterComposition.makeUpdate({
  CompletedReadCount: makeFieldsStep.fromMessage(({ count }) => ({
    count: () => count,
  })),
  ReceivedCount: makeFieldsStep.fromMessage(({ count }) => ({
    count: () => count,
  })),
})
const subscriptions = CounterDefinition.makeSubscriptions(entry => ({
  counts: entry('Counts', {
    messages: [Message.ReceivedCount],
    handler: function* () {
      const source = yield* CounterSource

      return () =>
        source.changes.pipe(
          Stream.map(count => Message.ReceivedCount({ count })),
        )
    },
  }),
}))
const inMessageUpdate = CounterComposition.makeInMessageUpdate({
  RequestedIncrement: model => ({
    model: { count: model.count + 1 },
    outMessage: OutMessage.ChangedCount({ count: model.count + 1 }),
  }),
})
const view = CounterComposition.makeView((model, h) =>
  h.output([], [`Count: ${model.count}`]),
)
export const layer = CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    inMessageUpdate,
    view,
    subscriptions,
    EffectsLayer: Layer.mergeAll(ReadCount.layer, subscriptions.layer),
  }),
).layer
