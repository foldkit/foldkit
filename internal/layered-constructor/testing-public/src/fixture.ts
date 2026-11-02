import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export class ConstructionFailure extends Error {
  readonly _tag = 'TestingConstructionFailure'
}

export class ConstructionSource extends Context.Service<
  ConstructionSource,
  Readonly<{
    acquire: Effect.Effect<void, ConstructionFailure>
    release: Effect.Effect<void>
  }>
>()('TestingPublic/ConstructionSource') {}

export const CounterKey = Symbol('TestingPublicCounter')
export const CounterModel = Schema.Struct({
  label: Schema.String,
  count: Schema.Number,
})
export const CounterMessage = defineMessageUnion({
  ClickedIncrement: {},
  UpdatedCount: { value: Schema.Number },
})
export const CounterOutMessage = defineMessageUnion({
  ChangedCount: { value: Schema.Number },
})
export const CounterDefinition = Block.makeDefinition('TestingPublicCounter', {
  key: CounterKey,
  Init: Schema.Tuple([Schema.String]),
  Model: CounterModel,
  Message: CounterMessage,
  OutMessage: CounterOutMessage,
  view: { kind: 'Element' },
})
export const CounterContract = CounterDefinition.contract
const counterComposition = CounterDefinition.makeComposition()
const counterInit = counterComposition.makeInit((label: string) => ({
  model: { label, count: 0 },
}))
const counterUpdate = counterComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, { count: count => count + 1 }),
    outMessage: CounterOutMessage.ChangedCount({ value: model.count + 1 }),
  }),
  UpdatedCount: (model, { value }) => ({
    model: modifyFields(model, { count: () => value }),
    outMessage: CounterOutMessage.ChangedCount({ value }),
  }),
})
const counterView = counterComposition.makeView((model, h) =>
  h.button(
    [h.OnClick(CounterMessage.ClickedIncrement())],
    [`${model.label}: ${model.count}`],
  ),
)
export const CounterBlock = CounterDefinition.makeBlock(
  Effect.gen(function* () {
    const source = yield* ConstructionSource
    yield* Effect.acquireRelease(source.acquire, () => source.release)

    return {
      children: [],
      init: counterInit,
      update: counterUpdate,
      view: counterView,
      EffectsLayer: Layer.empty,
    }
  }),
)

export const ParentKey = Symbol('TestingPublicParent')
export const ParentModel = Schema.Struct({
  child: CounterContract.Model,
  lastCount: Schema.Number,
})
export const ParentDefinition = Block.makeDefinition('TestingPublicParent', {
  key: ParentKey,
  Init: Schema.Tuple([]),
  Model: ParentModel,
  Message: Schema.Never,
  view: { kind: 'Element' },
})
export const CounterBinding = ParentDefinition.makeBinding(CounterContract, {
  field: 'child',
  init: { contextToArgs: () => ['Child'] },
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(CounterContract, {
    ChangedCount: ({ value }) =>
      ParentDefinition.makeFieldsStep(() => ({ lastCount: () => value })),
  }),
})
const parentComposition = ParentDefinition.makeComposition({
  bindings: [CounterBinding],
})
const parentInit = parentComposition.makeInit(() => ({
  model: { lastCount: 0 },
}))
const parentUpdate = parentComposition.makeUpdate({})
const parentView = parentComposition.makeView((model, h) =>
  h.block(
    CounterBinding.embedView({
      slotId: 'counter',
      model: model.child,
    }),
  ),
)
export const ParentBlock = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* CounterBinding

    return {
      children: [child],
      init: parentInit,
      update: parentUpdate,
      view: parentView,
      EffectsLayer: Layer.empty,
    }
  }),
).provide(CounterBlock.layer)

export const GrandParentKey = Symbol('TestingPublicGrandParent')
export const GrandParentDefinition = Block.makeDefinition(
  'TestingPublicGrandParent',
  {
    key: GrandParentKey,
    Init: Schema.Tuple([]),
    Model: Schema.Struct({ group: ParentDefinition.contract.Model }),
    Message: Schema.Never,
  },
)
export const GroupBinding = GrandParentDefinition.makeBinding(
  ParentDefinition.contract,
  {
    field: 'group',
  },
)
const grandParentComposition = GrandParentDefinition.makeComposition({
  bindings: [GroupBinding],
})
export const GrandParentBlock = GrandParentDefinition.makeBlock(
  Effect.gen(function* () {
    const group = yield* GroupBinding
    return {
      children: [group],
      init: grandParentComposition.makeInit(() => ({ model: {} })),
      update: grandParentComposition.makeUpdate({}),
    }
  }),
).provide(ParentBlock.layer)

export const ContextKey = Symbol('TestingPublicContext')
export const ContextDefinition = Block.makeDefinition('TestingPublicContext', {
  key: ContextKey,
  Init: Schema.Tuple([]),
  Context: Schema.Tuple([Schema.Number]),
  Model: Schema.Struct({ count: Schema.Number }),
  Message: CounterMessage,
  view: { kind: 'Element' },
})
const contextComposition = ContextDefinition.makeComposition()
const contextInit = contextComposition.makeInit(() => ({ model: { count: 0 } }))
const contextUpdate = contextComposition.makeUpdate.withContext(
  (multiplier: number) => ({
    ClickedIncrement: model => ({
      model: modifyFields(model, { count: count => count + multiplier }),
    }),
    UpdatedCount: (model, { value }) => ({
      model: modifyFields(model, { count: () => value * multiplier }),
    }),
  }),
)
const contextView = contextComposition.makeView((model, h) =>
  h.button(
    [h.OnClick(CounterMessage.ClickedIncrement())],
    [`Count: ${model.count}`],
  ),
)
export const ContextBlock = ContextDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: contextInit,
    update: contextUpdate,
    view: contextView,
    EffectsLayer: Layer.empty,
  }),
)

export const HeadlessKey = Symbol('TestingPublicHeadless')
export const HeadlessDefinition = Block.makeDefinition(
  'TestingPublicHeadless',
  {
    key: HeadlessKey,
    isMessageFree: true,
    Init: Schema.Tuple([]),
    Model: Schema.Struct({ count: Schema.Number }),
    Message: Schema.Never,
  },
)
const headlessComposition = HeadlessDefinition.makeComposition()
export const HeadlessBlock = HeadlessDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: headlessComposition.makeInit(() => ({ model: { count: 0 } })),
    update: headlessComposition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  }),
)

export const rawUpdate = (
  model: number,
  message: typeof CounterMessage.Type,
) => ({
  model: CounterMessage.match(message, {
    ClickedIncrement: () => model + 1,
    UpdatedCount: ({ value }) => value,
  }),
})
