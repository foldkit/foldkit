import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import type * as Mount from 'foldkit/mount'
import * as Scene from 'foldkit/scene'
import { expectTypeOf } from 'vitest'

const Message = defineMessageUnion({ CompletedMeasure: {} })
const Namespace = Block.makeNamespace('PublishedViewMount')
const Measure = Namespace.makeMount('Measure', {
  args: { label: Schema.String },
  messages: [Message.CompletedMeasure],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedMeasure())
  },
})
const ForeignNamespace = Block.makeNamespace('ForeignPublishedViewMount')
const ForeignMeasure = ForeignNamespace.makeMount('Measure', {
  args: { label: Schema.String },
  messages: [Message.CompletedMeasure],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedMeasure())
  },
})
type ViewInputs = Readonly<{
  toView: (
    attributes: ReadonlyArray<
      ChildAttribute<Mount.RequirementsOf<typeof Measure>>
    >,
  ) => Html
}>
const Key = Symbol('PublishedViewMount')
const Definition = Namespace.makeDefinition({
  key: Key,
  Init: Schema.Tuple([]),
  Model: Schema.Struct({}),
  Message,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ViewInputs>(),
    mounts: [Measure],
  },
})
const Composition = Definition.makeComposition({ mounts: [Measure] })
const init = Composition.makeInit(() => ({ model: {} }))
const update = Composition.makeUpdate({
  CompletedMeasure: model => ({ model }),
})
const view = Composition.makeView.withInputs((_model, { toView }, h) =>
  toView(childAttributes([h.OnMount(Measure({ label: 'Child' }))])),
)
const Implementation = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    view,
    EffectsLayer: Measure.layer,
  }),
)
const ParentKey = Symbol('PublishedViewMountParent')
const ParentDefinition = Block.makeDefinition('PublishedViewMountParent', {
  key: ParentKey,
  Init: Schema.Tuple([]),
  Model: Schema.Struct({ child: Definition.contract.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
})
const ChildBinding = ParentDefinition.makeBinding(Definition.contract, {
  field: 'child',
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const parentInit = ParentComposition.makeInit(() => ({ model: {} }))
const parentUpdate = ParentComposition.makeUpdate({})
const parentView = ParentComposition.makeView((model, h) =>
  h.block(
    ChildBinding.embedView({
      slotId: 'child',
      model: model.child,
      viewInputs: { toView: attributes => h.div(attributes) },
    }),
  ),
)
const Parent = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ChildBinding
    return {
      children: [child],
      init: parentInit,
      update: parentUpdate,
      view: parentView,
    }
  }),
).provide(Implementation.layer)
const EmptyComposition = Definition.makeComposition()
const emptyBody = {
  children: [],
  init: EmptyComposition.makeInit(() => ({ model: {} })),
  update: EmptyComposition.makeUpdate({
    CompletedMeasure: model => ({ model }),
  }),
  view: EmptyComposition.makeView.withInputs((_model, _inputs, h) => h.div([])),
}
const ForeignComposition = Definition.makeComposition({
  mounts: [ForeignMeasure],
})
const foreignBody = {
  children: [],
  init: ForeignComposition.makeInit(() => ({ model: {} })),
  update: ForeignComposition.makeUpdate({
    CompletedMeasure: model => ({ model }),
  }),
  view: ForeignComposition.makeView.withInputs((_model, _inputs, h) =>
    h.div([]),
  ),
  EffectsLayer: ForeignMeasure.layer,
}

if (false) {
  // @ts-expect-error A declared callback Mount must be registered by the implementation.
  Definition.makeBlock(Effect.succeed(emptyBody))
  // @ts-expect-error A different owner's Mount does not cover this declaration.
  Definition.makeBlock(Effect.succeed(foreignBody))
}

export {
  Definition,
  Implementation,
  Parent,
  Measure,
  Message,
  emptyBody,
  foreignBody,
}
expectTypeOf<
  Block.FactsOf<typeof Definition.contract>['mountRequirements']
>().toEqualTypeOf<Mount.RequirementsOf<typeof Measure>>()
export const acceptedScene = Scene.scene(
  Parent,
  Scene.init(),
  Scene.Mount.resolve(Measure, Message.CompletedMeasure()),
)
