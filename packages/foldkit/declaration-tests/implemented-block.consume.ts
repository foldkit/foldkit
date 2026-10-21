import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  type AssembledClockBlockType,
  type AssembledCounterBlockType,
  type AssembledOperatedCounterBlockType,
  type AssembledParentBlockType,
  type AssembledRecorderBlockType,
  ClockBlock,
  ClockComposition,
  CounterBlock,
  CounterComposition,
  CounterModel,
  HeadlessCounterBlock,
  OperatedCounterBlock,
  PanelBlock,
  ParentBlock,
  RecordValue,
  RecorderBlock,
  RecorderComposition,
  SaveCount,
  Store,
  clockInit,
  clockSubscriptions,
  clockUpdate,
  clockView,
  counterInit,
  counterUpdate,
  counterView,
  makeLabelledPanelBlock,
  program,
  recorderInit,
  recorderUpdate,
} from './implemented-block.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type EmittedCounterIdentity = Expect<
  Equal<typeof CounterBlock, AssembledCounterBlockType>
>
export type EmittedOperatedIdentity = Expect<
  Equal<typeof OperatedCounterBlock, AssembledOperatedCounterBlockType>
>
export type EmittedParentIdentity = Expect<
  Equal<typeof ParentBlock, AssembledParentBlockType>
>
export type EmittedClockIdentity = Expect<
  Equal<typeof ClockBlock, AssembledClockBlockType>
>
export type EmittedRecorderIdentity = Expect<
  Equal<typeof RecorderBlock, AssembledRecorderBlockType>
>

export const RelocatedCounterBlock = CounterComposition.implement({
  init: counterInit,
  update: counterUpdate,
  view: counterView,
  EffectsLayer: SaveCount.layer,
}).assembleBlock()
export type RelocatedCounterIdentity = Expect<
  Equal<typeof RelocatedCounterBlock, AssembledCounterBlockType>
>
export const RelocatedClockBlock = ClockComposition.implement({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  subscriptions: clockSubscriptions,
  EffectsLayer: clockSubscriptions.ticks.layer,
}).assembleBlock()
export type RelocatedClockIdentity = Expect<
  Equal<typeof RelocatedClockBlock, AssembledClockBlockType>
>
export const RelocatedRecorderBlock = RecorderComposition.implement({
  init: recorderInit,
  update: recorderUpdate,
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
}).assembleBlock()
export type RelocatedRecorderIdentity = Expect<
  Equal<typeof RelocatedRecorderBlock, AssembledRecorderBlockType>
>
export type ExactModel = Expect<
  Equal<typeof CounterBlock.Model, typeof CounterModel>
>
export type ExactInitArguments = Expect<
  Equal<Parameters<typeof OperatedCounterBlock.init>, [count: number]>
>
export type ExactOperation = Expect<
  Equal<
    Parameters<typeof OperatedCounterBlock.operations.requestSave>,
    [model: typeof CounterModel.Type]
  >
>
const ConsumerModel = Schema.Struct({
  counter: CounterModel,
  headless: CounterModel,
  panel: PanelBlock.Model,
})
const ConsumerMessage = defineMessageUnion({ ClickedConsumer: {} })
export const ConsumerDefinition = Block.makeDefinition('ImplementedConsumer', {
  Model: ConsumerModel,
  Message: ConsumerMessage,
})
export const ConsumerCounterBinding = ConsumerDefinition.makeBinding(
  CounterBlock,
  { field: 'counter' },
).withOutMessagePolicy({
  fold: ConsumerDefinition.makeOutMessageFold(CounterBlock, {
    Saved: ConsumerDefinition.makeNoopStep,
  }),
})
export const ConsumerHeadlessBinding = ConsumerDefinition.makeBinding(
  HeadlessCounterBlock,
  { field: 'headless' },
).withOutMessagePolicy({
  fold: ConsumerDefinition.makeOutMessageFold(HeadlessCounterBlock, {
    Saved: ConsumerDefinition.makeNoopStep,
  }),
})
export const ConsumerPanelBinding = ConsumerDefinition.makeBinding(PanelBlock, {
  field: 'panel',
})
export const ConsumerComposition = ConsumerDefinition.makeComposition({
  bindings: [
    ConsumerCounterBinding,
    ConsumerHeadlessBinding,
    ConsumerPanelBinding,
  ],
})
export const labelledPanel = makeLabelledPanelBlock<'Settings'>()
export type GenericFactoryViewInputs = Expect<
  Equal<
    Parameters<typeof labelledPanel.operations.toggle>,
    [model: typeof PanelBlock.Model.Type]
  >
>

Runtime.run(program.provide(Layer.succeed(Store, { save: () => Effect.void })))
export const consumerProgram = Program.make({
  block: ParentBlock,
  container: document.createElement('div'),
})
Runtime.run(
  consumerProgram.provide(Layer.succeed(Store, { save: () => Effect.void })),
)
