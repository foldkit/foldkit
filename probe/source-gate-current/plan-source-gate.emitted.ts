import { Effect, Layer, Schema } from 'effect'
import * as Block from '../../packages/foldkit/dist/block/public.js'
import type { CompositionOfPlan, PlanOutput } from '../../packages/foldkit/dist/experimental/hybrid/authoring.js'
import { defineMessageUnion } from '../../packages/foldkit/dist/message/index.js'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ClickedIncrement: {} })
const LocalKey = Symbol('PlanSourceLocal')
const ForeignKey = Symbol('PlanSourceForeign')
const Local = Block.make('PlanSourceLocal', { key: LocalKey, Model, Message, Init: Schema.Tuple([]), view: { kind: 'Element' } })
const Foreign = Block.make('PlanSourceForeign', { key: ForeignKey, Model, Message, Init: Schema.Tuple([]), view: { kind: 'Element' } })
const local = Local.makeComposition()
const foreign = Foreign.makeComposition()
const cases = { ClickedIncrement: Local.makeNoopStep() }
const init = local.makeInit(() => ({ model: Model.make({ count: 0 }) }))
const update = local.makeUpdate(cases)
const foreignUpdate = foreign.makeUpdate(cases)
const view = local.makeView((_model, h) => h.div([]))
const foreignView = foreign.makeView((_model, h) => h.div([]))
const MountA = Local.makeMount('First', { messages: [Message.ClickedIncrement], handler: function* () { return () => Effect.succeed(Message.ClickedIncrement()) } })
const MountB = Local.makeMount('Second', { messages: [Message.ClickedIncrement], handler: function* () { return () => Effect.succeed(Message.ClickedIncrement()) } })
const MountEffectsLayer = Layer.mergeAll(MountA.layer, MountB.layer)
const firstGraph = Local.makeComposition({ mounts: [MountA] })
const secondGraph = Local.makeComposition({ mounts: [MountB] })
const firstInit = firstGraph.makeInit(() => ({ model: Model.make({ count: 0 }) }))
const secondInit = secondGraph.makeInit(() => ({ model: Model.make({ count: 0 }) }))
const firstUpdate = firstGraph.makeUpdate(cases)
const secondUpdate = secondGraph.makeUpdate(cases)
const firstView = firstGraph.makeView((_model, h) => h.div([]))
const secondView = secondGraph.makeView((_model, h) => h.div([]))
declare const sourceOnlyForeignView: Block.Plan<PlanOutput<typeof view>, 'View', CompositionOfPlan<typeof foreignUpdate>>
declare const sourceOnlyOtherGraphView: Block.Plan<PlanOutput<typeof firstView>, 'View', CompositionOfPlan<typeof secondUpdate>>
declare const erasedUpdateSource: Block.Plan<PlanOutput<typeof update>, 'Update', any>
declare const erasedViewSource: Block.Plan<PlanOutput<typeof view>, 'View', any>
declare const chooseFirst: boolean
const crossed = chooseFirst
  ? { children: [], init: firstInit, update: secondUpdate, view: firstView, EffectsLayer: MountEffectsLayer }
  : { children: [], init: secondInit, update: firstUpdate, view: secondView, EffectsLayer: MountEffectsLayer }

const aligned = chooseFirst
  ? { children: [], init: firstInit, update: firstUpdate, view: firstView, EffectsLayer: MountEffectsLayer }
  : { children: [], init: secondInit, update: secondUpdate, view: secondView, EffectsLayer: MountEffectsLayer }
const validAlignedUnion = Local.makeLayer(Effect.succeed(aligned))
const valid = Local.makeLayer(Effect.succeed({ children: [], init, update, view }))
const ViewlessKey = Symbol('PlanSourceViewless')
const Viewless = Block.make('PlanSourceViewless', { key: ViewlessKey, Model, Message, Init: Schema.Tuple([]) })
const viewlessComposition = Viewless.makeComposition()
const validWithoutView = Viewless.makeLayer(Effect.succeed({
  children: [],
  init: viewlessComposition.makeInit(() => ({ model: Model.make({ count: 0 }) })),
  update: viewlessComposition.makeUpdate(cases),
}))
const makeValidGeneric = <Value extends number>(value: Value) => Local.makeLayer(Effect.succeed({
  children: [],
  init: local.makeInit(() => ({ model: Model.make({ count: value }) })),
  update,
  view,
}))
if (false) {
  // @ts-expect-error The update's owner differs while its decoded Model/Message and channels are identical.
  Local.makeLayer(Effect.succeed({ children: [], init, update: foreignUpdate, view }))
  // @ts-expect-error The view's owner differs while its Model/Message and rendering contract are identical.
  Local.makeLayer(Effect.succeed({ children: [], init, update, view: foreignView }))
  // @ts-expect-error One owner cannot substitute a different registered Mount graph for init's graph.
  Local.makeLayer(Effect.succeed({ children: [], init: firstInit, update: secondUpdate, view: firstView, EffectsLayer: MountEffectsLayer }))
  // @ts-expect-error A view with another registered Mount graph cannot accompany init's graph.
  Local.makeLayer(Effect.succeed({ children: [], init: firstInit, update: firstUpdate, view: secondView, EffectsLayer: MountEffectsLayer }))
  // @ts-expect-error A valid local rendering output cannot erase an incompatible exact view Source.
  Local.makeLayer(Effect.succeed({ children: [], init, update, view: sourceOnlyForeignView }))
  // @ts-expect-error Exact view Source retains the registered graph even when its rendering output is compatible.
  Local.makeLayer(Effect.succeed({ children: [], init: firstInit, update: firstUpdate, view: sourceOnlyOtherGraphView, EffectsLayer: MountEffectsLayer }))
  // @ts-expect-error An erased update Source cannot authenticate against init's exact graph.
  Local.makeLayer(Effect.succeed({ children: [], init, update: erasedUpdateSource, view }))
  // @ts-expect-error An erased view Source cannot authenticate against init's exact graph.
  Local.makeLayer(Effect.succeed({ children: [], init, update, view: erasedViewSource }))
  // @ts-expect-error Union alternatives must preserve each init/update pair, rather than comparing the union of sources.
  Local.makeLayer(Effect.succeed(crossed))
}
export const validContracts = [valid, validWithoutView, validAlignedUnion, makeValidGeneric]
