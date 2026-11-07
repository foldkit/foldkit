import { Effect, Schema } from 'effect'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
} from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import type * as Mount from '../../mount/index.js'
import * as Scene from '../../scene/public.js'

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
  InitArgs: Schema.Tuple([]),
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
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ child: Definition.contract.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
})
const ChildBinding = ParentDefinition.makeRequiredFieldBinding(
  Definition.contract,
  {
    field: 'child',
  },
)
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

describe('published view Mount contracts', () => {
  it.effect(
    'preserves exact callback authority through a bound public contract',
    () => {
      expectTypeOf<
        Block.FactsOf<typeof Definition.contract>['mountRequirements']
      >().toEqualTypeOf<Mount.RequirementsOf<typeof Measure>>()
      return Scene.scene(
        Parent,
        Scene.init(),
        Scene.Mount.resolve(Measure, Message.CompletedMeasure()),
      )
    },
  )

  it('rejects an erased constructor that omits the published original Mount', async () => {
    const incomplete = Reflect.apply(Definition.makeBlock, undefined, [
      Effect.succeed(emptyBody),
    ])
    await expect(
      Reflect.apply(Effect.runPromise, undefined, [
        Reflect.apply(Scene.withBlock, undefined, [
          incomplete,
          () => undefined,
        ]),
      ]),
    ).rejects.toThrow(
      'Published view Mounts must be original registered Mount Definitions',
    )
  })

  it('rejects a different original Mount even when construction is erased', async () => {
    const foreign = Reflect.apply(Definition.makeBlock, undefined, [
      Effect.succeed(foreignBody),
    ])
    await expect(
      Reflect.apply(Effect.runPromise, undefined, [
        Reflect.apply(Scene.withBlock, undefined, [foreign, () => undefined]),
      ]),
    ).rejects.toThrow(
      'Published view Mounts must be original registered Mount Definitions',
    )
  })
})
