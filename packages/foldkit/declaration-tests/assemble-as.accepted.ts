import { Context, Effect, Layer, Schema } from 'effect'
import { Block, Message } from 'foldkit'
import type { Command, Mount, Update } from 'foldkit'

export class Clock extends Context.Service<
  Clock,
  Readonly<{ now: Effect.Effect<number> }>
>()('AssembleAsFixture/Clock') {}

export class Store extends Context.Service<
  Store,
  Readonly<{ save: (note: string) => Effect.Effect<void> }>
>()('AssembleAsFixture/Store') {}

export class Audit extends Context.Service<
  Audit,
  Readonly<{ record: (note: string) => Effect.Effect<void> }>
>()('AssembleAsFixture/Audit') {}

export const CounterModel = Schema.Struct({ count: Schema.Number })
export const CounterMessage = Message.defineMessageUnion({
  RequestedTick: {},
  Ticked: { at: Schema.Number },
})
export const CounterDefinition = Block.makeDefinition('AssembleAsCounter', {
  Model: CounterModel,
  Message: CounterMessage,
})
export const Tick = CounterDefinition.makeCommand('Tick', {
  messages: [CounterMessage.Ticked],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.now.pipe(Effect.map(at => CounterMessage.Ticked({ at })))
  },
})
export const CounterComposition = CounterDefinition.makeComposition()
export const counterInit = CounterComposition.makeInit(() => ({
  model: CounterModel.make({ count: 0 }),
}))
export const counterUpdate = CounterComposition.makeUpdate((model, message) =>
  CounterMessage.match(message, {
    RequestedTick: () => ({ model, commands: [Tick()] }),
    Ticked: () => ({ model: CounterModel.make({ count: model.count + 1 }) }),
  }),
)
export const counterOperations = { tick: CounterMessage.RequestedTick }
export const CounterBlock = CounterComposition.assembleBlock({
  init: counterInit,
  update: counterUpdate,
  operations: counterOperations,
  EffectsLayer: Tick.layer,
})

export const ReporterModel = Schema.Struct({ reported: Schema.Number })
export const ReporterMessage = Message.defineMessageUnion({ Reported: {} })
export const ReporterOutMessage = Message.defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
export const ReporterDefinition = Block.makeDefinition('AssembleAsReporter', {
  Model: ReporterModel,
  Message: ReporterMessage,
  OutMessage: ReporterOutMessage,
})
export const ReporterComposition = ReporterDefinition.makeComposition()
export const reporterInit = ReporterComposition.makeInit(() => ({
  model: ReporterModel.make({ reported: 0 }),
}))
export const reporterUpdate = ReporterComposition.makeUpdate(model => ({
  model: ReporterModel.make({ reported: model.reported + 1 }),
  outMessage: ReporterOutMessage.ReportedCount({ count: model.reported + 1 }),
}))

export const ParentModel = Schema.Struct({
  counter: CounterModel,
  note: Schema.String,
})
export const ParentMessage = Message.defineMessageUnion({
  RequestedSave: {},
  Saved: {},
  RequestedTick: {},
  Observed: {},
})
export const ParentDefinition = Block.makeDefinition('AssembleAsParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
export const Save = ParentDefinition.makeCommand('Save', {
  messages: [ParentMessage.Saved],
  handler: function* () {
    const store = yield* Store

    return () => store.save('note').pipe(Effect.as(ParentMessage.Saved()))
  },
})
export const Record = ParentDefinition.makeCommand('Record', {
  messages: [ParentMessage.Saved],
  handler: function* () {
    const audit = yield* Audit

    return () => audit.record('note').pipe(Effect.as(ParentMessage.Saved()))
  },
})
export const Observe = ParentDefinition.makeMount('Observe', {
  messages: [ParentMessage.Observed],
  handler: function* () {
    return () => Effect.succeed(ParentMessage.Observed())
  },
})
export const CounterBinding = ParentDefinition.makeBinding(CounterBlock, {
  field: 'counter',
  init: { contextToArgs: () => [] },
})
export const ParentComposition = ParentDefinition.makeComposition({
  mounts: [Observe],
  bindings: [CounterBinding],
})

export const init = ParentComposition.makeInit(() => ({
  model: { note: '' },
}))
export const update = ParentComposition.makeUpdate((model, message) =>
  ParentMessage.match(message, {
    RequestedSave: () => ({ model, commands: [Save()] }),
    Saved: () => ({ model }),
    RequestedTick: () => CounterBinding.tick()(model),
    Observed: () => ({ model }),
  }),
)
export const view = ParentComposition.makeView((model, h) =>
  h.div([h.OnMount(Observe())], [model.note]),
)
export const EffectsLayer = Layer.mergeAll(Save.layer, Observe.layer)

// An exact implementation contract in the generated style. It reads the
// registered graph, Commands, Mounts, and Schemas, never the init, update,
// view, or EffectsLayer values.
export type ParentBindings = (typeof ParentComposition)['bindings']
export type ParentDispatch = (typeof ParentComposition)['Message']
type Model = typeof ParentModel.Type
type ChildInitRequirements<B extends Block.AnyBinding> = B extends unknown
  ? Block.Qualify<
      B['placement'],
      Update.RequirementsOf<Block.BlockOfBinding<B>['init']>
    >
  : never
type ChildUpdateRequirements<B extends Block.AnyBinding> = B extends unknown
  ? Block.Qualify<
      B['placement'],
      Update.RequirementsOf<Block.BlockOfBinding<B>['update']>
    >
  : never
export type ParentInitRequirements = ChildInitRequirements<
  ParentBindings[number]
>
export type ParentUpdateRequirements =
  | ChildUpdateRequirements<ParentBindings[number]>
  | Command.HandlerOf<typeof Save>
export type ParentInit = (
  ...args: []
) => Update.Return<Model, ParentDispatch['Type'], ParentInitRequirements>
export interface ParentUpdate {
  (
    message: ParentDispatch['Type'],
  ): (
    model: Model,
  ) => Update.Return<Model, ParentDispatch['Type'], ParentUpdateRequirements>
  (
    model: Model,
    message: ParentDispatch['Type'],
  ): Update.Return<Model, ParentDispatch['Type'], ParentUpdateRequirements>
}
export type ParentViewRequirements =
  | Mount.RequirementsOf<typeof Observe>
  | Block.RequirementsOfBindings<ParentBindings>
export type ParentView = Block.OwnedAuthoredView<
  Block.View<Model, ParentDispatch['Type'], void, ParentViewRequirements>,
  typeof ParentDefinition.owner,
  Model,
  ParentDispatch['Type'],
  ParentViewRequirements
>
export type ParentLocalLayer = Layer.Layer<
  Command.HandlerOf<typeof Save> | Mount.RequirementsOf<typeof Observe>,
  never,
  Store
>
export interface ParentImplementation {
  readonly init: ParentInit
  readonly update: ParentUpdate
  readonly view: ParentView
  readonly EffectsLayer: ParentLocalLayer
}

const assembled = ParentComposition.assembleAs<ParentImplementation>()({
  init,
  update,
  view,
  EffectsLayer,
})
export const inferred = ParentComposition.assembleBlock({
  init,
  update,
  view,
  EffectsLayer,
})

type Assert<T extends true> = T
type IsAny<T> = 0 extends 1 & T ? true : false
type IsNever<T> = [T] extends [never] ? true : false
type Same<A, B> = [A, B] extends [B, A] ? true : false
type Checked = typeof assembled
type Inferred = typeof inferred
export type CheckedNotAny = Assert<Same<IsAny<Checked>, false>>
export type CheckedNotNever = Assert<Same<IsNever<Checked>, false>>
export type CheckedToInferred = Assert<Checked extends Inferred ? true : false>
export type InferredToChecked = Assert<Inferred extends Checked ? true : false>
export type SameKeys = Assert<Same<keyof Checked, keyof Inferred>>
export type SameMembers = Assert<
  Same<
    {
      [Key in keyof Checked]-?: Same<
        Checked[Key],
        Inferred[Key & keyof Inferred]
      >
    }[keyof Checked],
    true
  >
>

// Exposed operations: the contract holds their authored form (a Message
// constructor); both sides are compared through the same public projection.
const counterInferred = CounterComposition.assembleBlock({
  init: counterInit,
  update: counterUpdate,
  operations: counterOperations,
  EffectsLayer: Tick.layer,
})
type CounterImplementation = Pick<typeof counterInferred, 'init' | 'update'> &
  Readonly<{
    operations: Readonly<{ tick: typeof CounterMessage.RequestedTick }>
    EffectsLayer: typeof Tick.layer
  }>
const counterChecked = CounterComposition.assembleAs<CounterImplementation>()({
  init: counterInit,
  update: counterUpdate,
  operations: counterOperations,
  EffectsLayer: Tick.layer,
})
export type CounterSameMembers = Assert<
  Same<
    {
      [Key in keyof typeof counterChecked]-?: Same<
        (typeof counterChecked)[Key],
        (typeof counterInferred)[Key & keyof typeof counterInferred]
      >
    }[keyof typeof counterChecked],
    true
  >
>
export type CounterSameKeys = Assert<
  Same<keyof typeof counterChecked, keyof typeof counterInferred>
>

// Headless OutMessage Block with an omitted Layer.
const reporterInferred = ReporterComposition.assembleBlock({
  init: reporterInit,
  update: reporterUpdate,
})
type ReporterImplementation = Pick<typeof reporterInferred, 'init' | 'update'> &
  Readonly<{ EffectsLayer: Layer.Layer<never> }>
const reporterChecked =
  ReporterComposition.assembleAs<ReporterImplementation>()({
    init: reporterInit,
    update: reporterUpdate,
  })
export type ReporterSameMembers = Assert<
  Same<
    {
      [Key in keyof typeof reporterChecked]-?: Same<
        (typeof reporterChecked)[Key],
        (typeof reporterInferred)[Key & keyof typeof reporterInferred]
      >
    }[keyof typeof reporterChecked],
    true
  >
>
export type ReporterSameKeys = Assert<
  Same<keyof typeof reporterChecked, keyof typeof reporterInferred>
>
export { assembled, counterChecked, reporterChecked }
