import { Context, Effect, Layer, Schema, Stream } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export class Store extends Context.Service<
  Store,
  { save: (count: number) => Effect.Effect<void> }
>()('ImplementedBlock/Store') {}

export const CounterModel = Schema.Struct({ count: Schema.Number })
export const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  RequestedSave: {},
  CompletedSave: {},
})
export const CounterOutMessage = defineMessageUnion({
  Saved: { count: Schema.Number },
})
export const CounterDefinition = Block.makeDefinition('ImplementedCounter', {
  Model: CounterModel,
  Message: CounterMessage,
  OutMessage: CounterOutMessage,
})
export const SaveCount = CounterDefinition.makeCommand('SaveCount', {
  args: { count: Schema.Number },
  messages: [CounterMessage.CompletedSave],
  handler: function* () {
    const store = yield* Store
    return ({ count }) =>
      store.save(count).pipe(Effect.as(CounterMessage.CompletedSave()))
  },
})
export const CounterComposition = CounterDefinition.makeComposition()
export const counterInit = CounterComposition.makeInit(() => ({
  model: { count: 0 },
}))
export const counterUpdate = CounterComposition.makeUpdate((model, message) =>
  CounterMessage.match(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
    RequestedSave: () => ({
      model,
      commands: [SaveCount({ count: model.count })],
    }),
    CompletedSave: () => ({
      model,
      outMessage: CounterOutMessage.Saved({ count: model.count }),
    }),
  }),
)
export const counterView = CounterComposition.makeView((model, h) =>
  h.button(
    [h.OnClick(CounterMessage.ClickedIncrement())],
    [String(model.count)],
  ),
)

export const CounterBlock = CounterComposition.implement({
  init: counterInit,
  update: counterUpdate,
  view: counterView,
  EffectsLayer: SaveCount.layer,
}).assembleBlock()
const AssembledCounterBlock = CounterComposition.assembleBlock({
  init: counterInit,
  update: counterUpdate,
  view: counterView,
  EffectsLayer: SaveCount.layer,
})
export type CounterBlockIdentity = Expect<
  Equal<typeof CounterBlock, typeof AssembledCounterBlock>
>
export type AssembledCounterBlockType = typeof AssembledCounterBlock

export const OperatedCounterBlock = CounterComposition.implement({
  init: CounterComposition.makeInit((count: number) => ({
    model: { count },
  })),
  update: counterUpdate,
  view: counterView,
  operations: { requestSave: CounterMessage.RequestedSave },
  EffectsLayer: Layer.merge(SaveCount.layer, Layer.empty),
}).assembleBlock()
const AssembledOperatedCounterBlock = CounterComposition.assembleBlock({
  init: CounterComposition.makeInit((count: number) => ({
    model: { count },
  })),
  update: counterUpdate,
  view: counterView,
  operations: { requestSave: CounterMessage.RequestedSave },
  EffectsLayer: Layer.merge(SaveCount.layer, Layer.empty),
})
export type OperatedCounterBlockIdentity = Expect<
  Equal<typeof OperatedCounterBlock, typeof AssembledOperatedCounterBlock>
>
export type AssembledOperatedCounterBlockType =
  typeof AssembledOperatedCounterBlock

export const HeadlessCounterBlock = CounterComposition.implement({
  init: counterInit,
  update: counterUpdate,
  EffectsLayer: SaveCount.layer,
}).assembleBlock()
const AssembledHeadlessCounterBlock = CounterComposition.assembleBlock({
  init: counterInit,
  update: counterUpdate,
  EffectsLayer: SaveCount.layer,
})
export type HeadlessCounterBlockIdentity = Expect<
  Equal<typeof HeadlessCounterBlock, typeof AssembledHeadlessCounterBlock>
>

export const PanelModel = Schema.Struct({ isOpen: Schema.Boolean })
export const PanelMessage = defineMessageUnion({ ToggledPanel: {} })
export const PanelComposition = Block.makeDefinition('ImplementedPanel', {
  Model: PanelModel,
  Message: PanelMessage,
}).makeComposition()
export const panelInit = PanelComposition.makeInit(() => ({
  model: { isOpen: false },
}))
export const panelUpdate = PanelComposition.makeUpdate(model => ({
  model: modifyFields(model, { isOpen: isOpen => !isOpen }),
}))
export const panelView = PanelComposition.makeView((model, h) =>
  h.div([h.OnClick(PanelMessage.ToggledPanel())], [String(model.isOpen)]),
)
export const PanelBlock = PanelComposition.implement({
  init: panelInit,
  update: panelUpdate,
  view: panelView,
}).assembleBlock()
const AssembledPanelBlock = PanelComposition.assembleBlock({
  init: panelInit,
  update: panelUpdate,
  view: panelView,
})
export type PanelBlockIdentity = Expect<
  Equal<typeof PanelBlock, typeof AssembledPanelBlock>
>

export const ErasedCounterImplementation: Block.Implementation<
  typeof CounterModel.Type,
  typeof CounterMessage.Type,
  typeof CounterOutMessage.Type
> = {
  init: counterInit,
  update: counterUpdate,
  view: counterView,
  EffectsLayer: SaveCount.layer,
}
export const ErasedCounterBlock = CounterComposition.implement(
  ErasedCounterImplementation,
).assembleBlock()
const AssembledErasedCounterBlock = CounterComposition.assembleBlock(
  ErasedCounterImplementation,
)
export type ErasedCounterBlockIdentity = Expect<
  Equal<typeof ErasedCounterBlock, typeof AssembledErasedCounterBlock>
>
export type ErasedCounterBlockIsUnusable = Expect<
  Equal<typeof ErasedCounterBlock, never>
>

export const ClockModel = Schema.Struct({ ticks: Schema.Number })
export const ClockMessage = defineMessageUnion({
  Ticked: {},
  RequestedReset: {},
})
export const ClockDefinition = Block.makeDefinition('ImplementedClock', {
  Model: ClockModel,
  Message: ClockMessage,
})
export const clockSubscriptions = ClockDefinition.makeSubscriptions(entry => ({
  ticks: entry('Ticks', {
    messages: [ClockMessage.Ticked],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
export const ClockComposition = ClockDefinition.makeComposition()
export const clockInit = ClockComposition.makeInit(() => ({
  model: { ticks: 0 },
}))
export const clockUpdate = ClockComposition.makeUpdate((model, message) =>
  ClockMessage.match(message, {
    Ticked: () => ({
      model: modifyFields(model, { ticks: ticks => ticks + 1 }),
    }),
    RequestedReset: () => ({
      model: modifyFields(model, { ticks: () => 0 }),
    }),
  }),
)
export const clockView = ClockComposition.makeView((model, h) =>
  h.span([], [String(model.ticks)]),
)

export const ClockBlock = ClockComposition.implement({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  subscriptions: clockSubscriptions,
  EffectsLayer: clockSubscriptions.ticks.layer,
}).assembleBlock()
const AssembledClockBlock = ClockComposition.assembleBlock({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  subscriptions: clockSubscriptions,
  EffectsLayer: clockSubscriptions.ticks.layer,
})
export type ClockBlockIdentity = Expect<
  Equal<typeof ClockBlock, typeof AssembledClockBlock>
>
export type AssembledClockBlockType = typeof AssembledClockBlock

export const OperatedClockBlock = ClockComposition.implement({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  subscriptions: clockSubscriptions,
  operations: { reset: ClockMessage.RequestedReset },
  EffectsLayer: clockSubscriptions.ticks.layer,
}).assembleBlock()
const AssembledOperatedClockBlock = ClockComposition.assembleBlock({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  subscriptions: clockSubscriptions,
  operations: { reset: ClockMessage.RequestedReset },
  EffectsLayer: clockSubscriptions.ticks.layer,
})
export type OperatedClockBlockIdentity = Expect<
  Equal<typeof OperatedClockBlock, typeof AssembledOperatedClockBlock>
>

export const ManagedClockBlock = ClockComposition.implement({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  managedResources: {},
  operations: { reset: ClockMessage.RequestedReset },
  EffectsLayer: Layer.empty,
}).assembleBlock()
const AssembledManagedClockBlock = ClockComposition.assembleBlock({
  init: clockInit,
  update: clockUpdate,
  view: clockView,
  managedResources: {},
  operations: { reset: ClockMessage.RequestedReset },
  EffectsLayer: Layer.empty,
})
export type ManagedClockBlockIdentity = Expect<
  Equal<typeof ManagedClockBlock, typeof AssembledManagedClockBlock>
>

export const RecorderModel = Schema.Struct({ recorded: Schema.Number })
export const RecorderMessage = defineMessageUnion({
  RequestedRecord: {},
  CompletedRecord: {},
})
export const RecorderDefinition = Block.makeDefinition('ImplementedRecorder', {
  Model: RecorderModel,
  Message: RecorderMessage,
})
export const RecordValue = RecorderDefinition.makeCommand('RecordValue', {
  args: { recorded: Schema.Number },
  messages: [RecorderMessage.CompletedRecord],
})
export const RecorderComposition = RecorderDefinition.makeComposition()
export const recorderInit = RecorderComposition.makeInit(() => ({
  model: { recorded: 0 },
}))
export const recorderUpdate = RecorderComposition.makeUpdate((model, message) =>
  RecorderMessage.match(message, {
    RequestedRecord: () => ({
      model,
      commands: [RecordValue({ recorded: model.recorded })],
    }),
    CompletedRecord: () => ({
      model: modifyFields(model, { recorded: recorded => recorded + 1 }),
    }),
  }),
)

export const RecorderBlock = RecorderComposition.implement({
  init: recorderInit,
  update: recorderUpdate,
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
}).assembleBlock()
const AssembledRecorderBlock = RecorderComposition.assembleBlock({
  init: recorderInit,
  update: recorderUpdate,
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})
export type RecorderBlockIdentity = Expect<
  Equal<typeof RecorderBlock, typeof AssembledRecorderBlock>
>
export type AssembledRecorderBlockType = typeof AssembledRecorderBlock
export const ProvidedRecorderBlock = RecorderBlock.provideHandlers(
  RecordValue.toLayer(
    Effect.succeed(() => Effect.succeed(RecorderMessage.CompletedRecord())),
  ),
)
const ProvidedAssembledRecorderBlock = AssembledRecorderBlock.provideHandlers(
  RecordValue.toLayer(
    Effect.succeed(() => Effect.succeed(RecorderMessage.CompletedRecord())),
  ),
)
export type ProvidedRecorderIdentity = Expect<
  Equal<typeof ProvidedRecorderBlock, typeof ProvidedAssembledRecorderBlock>
>

export const makeLabelledPanelBlock = <Label extends string>() => {
  const labelledView = PanelComposition.makeView.withInputs<
    Readonly<{ label: Label }>
  >((model, viewInputs, h) =>
    h.div([], [viewInputs.label, String(model.isOpen)]),
  )
  const implemented = PanelComposition.implement({
    init: panelInit,
    update: panelUpdate,
    view: labelledView,
    operations: { toggle: PanelMessage.ToggledPanel },
    EffectsLayer: Layer.empty,
  }).assembleBlock()
  const assembled = PanelComposition.assembleBlock({
    init: panelInit,
    update: panelUpdate,
    view: labelledView,
    operations: { toggle: PanelMessage.ToggledPanel },
    EffectsLayer: Layer.empty,
  })
  const isIdenticalToAssembled: Equal<typeof implemented, typeof assembled> =
    true
  void isIdenticalToAssembled
  return implemented
}

export const ParentModel = Schema.Struct({
  counter: CounterModel,
  panel: PanelModel,
  savedCount: Schema.Number,
})
export const ParentMessage = defineMessageUnion({ ClickedReset: {} })
export const ParentDefinition = Block.makeDefinition('ImplementedParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const CounterBinding = ParentDefinition.makeBinding(CounterBlock, {
  field: 'counter',
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(CounterBlock, {
    Saved: ({ count }) =>
      ParentDefinition.makeFieldsStep(() => ({ savedCount: () => count })),
  }),
})
export const PanelBinding = ParentDefinition.makeBinding(PanelBlock, {
  field: 'panel',
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [CounterBinding, PanelBinding],
})
export const parentInit = ParentComposition.makeInit(() => ({
  model: { savedCount: 0 },
}))
export const parentUpdate = ParentComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    ClickedReset: () => ({
      model: modifyFields(model, { savedCount: () => 0 }),
    }),
  }),
)
export const parentView = ParentComposition.makeView((model, h) => ({
  title: 'Implemented',
  body: h.main(
    [],
    [
      h.block(
        CounterBinding.embedView({ slotId: 'counter', model: model.counter }),
      ),
      h.block(PanelBinding.embedView({ slotId: 'panel', model: model.panel })),
    ],
  ),
}))
export const ParentBlock = ParentComposition.implement({
  init: parentInit,
  update: parentUpdate,
  view: parentView,
}).assembleBlock()
const AssembledParentBlock = ParentComposition.assembleBlock({
  init: parentInit,
  update: parentUpdate,
  view: parentView,
})
export type ParentBlockIdentity = Expect<
  Equal<typeof ParentBlock, typeof AssembledParentBlock>
>
export type AssembledParentBlockType = typeof AssembledParentBlock

export const program = Program.make({
  block: ParentBlock,
  container: document.createElement('div'),
})
export const assembledProgram = Program.make({
  block: AssembledParentBlock,
  container: document.createElement('div'),
})
export type ProgramIdentity = Expect<
  Equal<typeof program, typeof assembledProgram>
>

Runtime.run(program.provide(Layer.succeed(Store, { save: () => Effect.void })))
