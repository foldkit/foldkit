import { Array, Effect, Schema } from 'effect'

import { Block, Message, Update } from '../../../index.js'
import {
  CounterBlock,
  layer as CounterLayer,
  CounterSource,
} from './counter.js'

export const PairedModel = Schema.Struct({
  primaryCounters: Schema.Array(CounterBlock.Instance),
  secondaryCounters: Schema.Array(CounterBlock.Instance),
  primaryCount: Schema.Number,
  secondaryCount: Schema.Number,
  total: Schema.Number,
})
export type PairedModel = typeof PairedModel.Type
export const PairedMessage = Message.defineMessageUnion({
  ClickedAddPair: { key: Schema.String, count: Schema.Number },
  ClickedIncrementPrimary: { key: Schema.String },
  ClickedIncrementSecondary: { key: Schema.String },
  ClickedKeepCounters: {},
})
export type PairedMessage = typeof PairedMessage.Type
export const PairedInMessage = Message.defineInMessageUnion({
  RequestedAddPair: { key: Schema.String, count: Schema.Number },
})
export type PairedInMessage = typeof PairedInMessage.Type
const PairedKey = Symbol('PairedCounterFields')
export const PairedDefinition = Block.makeDefinition('PairedCounterFields', {
  key: PairedKey,
  Model: PairedModel,
  Message: PairedMessage,
  InMessage: PairedInMessage,
  Context: Schema.Tuple([Schema.Number]),
  InMessageContext: Schema.Tuple([Schema.Number]),
  InitArgs: Schema.Tuple([]),
  effects: { services: [CounterSource] },
})
const { makeFieldsStep, makeStep } = PairedDefinition
export const PrimaryCountersBinding = PairedDefinition.makeKeyedArrayBinding(
  CounterBlock,
  {
    field: 'primaryCounters',
    placement: 'primaryCounters',
    key: 'key',
    childField: 'model',
  },
).withOutMessagePolicy({
  fold: (_key, outMessage) =>
    PairedDefinition.makeOutMessageFold(CounterBlock, {
      ChangedCount: ({ count }) =>
        makeFieldsStep(() => ({ primaryCount: () => count })),
    })(outMessage),
})
export const SecondaryCountersBinding = PairedDefinition.makeKeyedArrayBinding(
  CounterBlock,
  {
    field: 'secondaryCounters',
    placement: 'secondaryCounters',
    key: 'key',
    childField: 'model',
  },
).withOutMessagePolicy({
  fold: (_key, outMessage) =>
    PairedDefinition.makeOutMessageFold(CounterBlock, {
      ChangedCount: ({ count }) =>
        makeFieldsStep(() => ({ secondaryCount: () => count })),
    })(outMessage),
})
export const PairedComposition = PairedDefinition.makeComposition({
  bindings: [PrimaryCountersBinding, SecondaryCountersBinding],
})
export const addPair = (key: string, count: number) =>
  makeFieldsStep(() => ({
    primaryCounters: Array.append(
      PrimaryCountersBinding.create({ key, args: [count] }),
    ),
    secondaryCounters: Array.append(
      SecondaryCountersBinding.create({ key, args: [count + 1] }),
    ),
  }))
const totalCounters = makeFieldsStep(model => ({
  total: () =>
    Array.reduce(
      [...model.primaryCounters, ...model.secondaryCounters],
      0,
      (sum, counter) => sum + counter.model.count,
    ),
}))
const update = PairedComposition.makeUpdate.withContext((offset: number) => ({
  ClickedAddPair: makeStep((_model, { key, count }) =>
    Update.combineSteps([addPair(key, count + offset), totalCounters]),
  ),
  ClickedIncrementPrimary: makeStep.fromMessage(({ key }) =>
    PrimaryCountersBinding.requestIncrement(key),
  ),
  ClickedIncrementSecondary: makeStep.fromMessage(({ key }) =>
    SecondaryCountersBinding.requestIncrement(key),
  ),
  ClickedKeepCounters: makeFieldsStep(() => ({})),
}))
const inMessageUpdate = PairedComposition.makeInMessageUpdate.withContext(
  (offset: number) => ({
    RequestedAddPair: makeStep((_model, { key, count }) =>
      Update.combineSteps([addPair(key, count + offset), totalCounters]),
    ),
  }),
)
export const PairedBlock = PairedDefinition.makeBlock(
  Effect.gen(function* () {
    const primaryCounters = yield* PrimaryCountersBinding
    const secondaryCounters = yield* SecondaryCountersBinding

    return {
      children: [primaryCounters, secondaryCounters],
      init: PairedComposition.makeInit(() => ({
        model: {
          primaryCounters: [],
          secondaryCounters: [],
          primaryCount: 0,
          secondaryCount: 0,
          total: 0,
        },
      })),
      update,
      inMessageUpdate,
    }
  }),
).provide(CounterLayer)
