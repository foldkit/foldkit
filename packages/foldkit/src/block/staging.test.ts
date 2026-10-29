import { Context, Effect, Layer, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition, makeNamespace } from './define.js'
import * as Block from './public.js'

class ObserveDependency extends Context.Service<ObserveDependency, object>()(
  'BlockStaging/ObserveDependency',
) {}

const unavailable: Effect.Effect<void, 'ObserveUnavailable'> =
  Effect.fail('ObserveUnavailable')

const ChildNamespace = makeNamespace('StagedChild')
const ChildModel = Schema.Struct({ value: Schema.String })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  CompletedObserve: {},
  CompletedMeasure: {},
})
type ChildMessage = typeof ChildMessage.Type

const Observe = ChildNamespace.makeMount('Observe', {
  messages: [ChildMessage.CompletedObserve],
  handler: function* () {
    yield* ObserveDependency
    yield* unavailable

    return () => Effect.succeed(ChildMessage.CompletedObserve())
  },
})

const Measure = ChildNamespace.makeMount('Measure', {
  messages: [ChildMessage.CompletedMeasure],
})

const ChildBaseDefinition = ChildNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
})
const graphlessComposition = ChildBaseDefinition.makeComposition()
const observeComposition = ChildBaseDefinition.makeComposition({
  mounts: [Observe],
})
const measureComposition = ChildBaseDefinition.makeComposition({
  mounts: [Measure],
})

const graphlessView = graphlessComposition.makeView((model, h) =>
  h.div([], [model.value]),
)

const defaultView = observeComposition.makeView.withInputs<
  Readonly<{ label: string }>
>((model, { label }, h) =>
  h.div([h.OnMount(Observe())], [`${label}: ${model.value}`]),
)

const prepareChild = () =>
  observeComposition.prepareBlock({
    init: () => ({ model: ChildModel.make({ value: 'initial' }) }),
    update: observeComposition.makeUpdate({
      CompletedMeasure: model => ({ model }),
      CompletedObserve: model => ({ model }),
    }),
    view: defaultView,
    EffectsLayer: Observe.layer,
  })
const Child: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const ParentModel = Schema.Struct({ child: ChildModel })
type ParentModel = typeof ParentModel.Type
const Parent = makeDefinition('StagedParent', {
  Model: ParentModel,
  Message: Schema.Never,
})

const DirectChildBinding = Parent.makeBinding(Child, {
  field: 'child',
})

const ExplicitChildBinding = Parent.makeBinding(Child, {
  read: model => Option.some(model.child),
  write: (_model, child) => ParentModel.make({ child }),
})

const alternateView = Child.makeView.withInputs<Readonly<{ prefix: string }>>(
  (model, { prefix }, h) =>
    h.div([h.OnMount(Observe())], [`${prefix}: ${model.value}`]),
)

const initialParent = ParentModel.make({
  child: ChildModel.make({ value: 'initial' }),
})
const defaultEmbed = DirectChildBinding.embedView({
  slotId: 'default-child',
  model: initialParent.child,
  viewInputs: { label: 'Default' },
})
const alternateEmbed = DirectChildBinding.embedView({
  slotId: 'alternate-child',
  model: initialParent.child,
  view: alternateView,
  viewInputs: { prefix: 'Alternate' },
})

if (false) {
  // @ts-expect-error A Definition does not author the primary view.
  ChildBaseDefinition.makeView

  graphlessComposition.makeView((_model, h) =>
    h.div([
      // @ts-expect-error A graphless Composition cannot use an unregistered Mount.
      h.OnMount(Observe()),
    ]),
  )

  // @ts-expect-error A graphless Composition cannot complete a Mount-capable view.
  graphlessComposition.prepareBlock({
    init: Child.init,
    update: Child.update,
    view: defaultView,
    EffectsLayer: Observe.layer,
  })

  graphlessComposition.makeView((_model, h) =>
    h.button([
      // @ts-expect-error A view accepts only its Composition's Message.
      h.OnClick({ _tag: 'ForeignMessage' }),
    ]),
  )

  graphlessComposition.makeView.withInputs<void>(
    // @ts-expect-error void cannot describe usable per-render ViewInputs.
    (_model, _inputs, h) => h.empty,
  )

  // @ts-expect-error A Composition cannot establish another graph.
  observeComposition.makeComposition({ mounts: [Measure] })

  DirectChildBinding.embedView({
    slotId: 'missing-default-inputs',
    model: initialParent.child,
    // @ts-expect-error The completed Block retains its default ViewInputs.
    viewInputs: { prefix: 'Wrong' },
  })

  const ForeignModel = Schema.Struct({ unrelated: Schema.String })
  type ForeignModel = typeof ForeignModel.Type

  makeNamespace('StagedForeignModelParent')
    .makeDefinition({
      Model: ForeignModel,
      Message: Schema.Never,
    })
    .makeComposition(
      // @ts-expect-error A child Binding must use the Composition's parent Model.
      {
        bindings: [DirectChildBinding],
      },
    )
}

it('creates independent immutable graphs from one typed Base', () => {
  expect(ChildBaseDefinition.mounts).toEqual([])
  expect(ChildBaseDefinition).not.toHaveProperty('makeView')
  expect(graphlessComposition.makeView).toBeTypeOf('function')
  void graphlessView
  expect(observeComposition.owner).toBe(ChildBaseDefinition.owner)
  expect(observeComposition.makeUpdate).toBeTypeOf('function')
  expect(observeComposition).not.toHaveProperty('makeStep')
  expect(observeComposition).not.toHaveProperty('makeSubscriptions')
  expect(observeComposition).not.toHaveProperty('makeManagedResources')
  expect(measureComposition.owner).toBe(ChildBaseDefinition.owner)
  expect(observeComposition).not.toBe(measureComposition)
  expect(observeComposition.mounts).toEqual([Observe])
  expect(measureComposition.mounts).toEqual([Measure])
})

it('preserves completed view capabilities and default ViewInputs', () => {
  expect(defaultEmbed.view).toBe(defaultView)
  expectTypeOf(defaultEmbed.viewInputs).toEqualTypeOf<
    Readonly<{ label: string }>
  >()
  expect(alternateEmbed.view).toBe(alternateView)
  expectTypeOf(alternateEmbed.viewInputs).toEqualTypeOf<
    Readonly<{ prefix: string }>
  >()
})

it('matches required-field and explicit Binding behavior', () => {
  const DirectComposition = Parent.makeComposition({
    bindings: [DirectChildBinding],
  })
  const ExplicitComposition = Parent.makeComposition({
    bindings: [ExplicitChildBinding],
  })
  const updateDirect = DirectComposition.makeUpdate({})
  const updateExplicit = ExplicitComposition.makeUpdate({})
  const childMessage = ChildMessage.CompletedObserve()
  const directUpdate = updateDirect(initialParent, {
    _tag: 'GotChildMessage',
    placement: 'child',
    generation: 0,
    message: childMessage,
  })
  const explicitUpdate = updateExplicit(initialParent, {
    _tag: 'GotStagedChildMessage',
    placement: 'StagedChild',
    generation: 0,
    message: childMessage,
  })

  expect(directUpdate.model).toEqual(explicitUpdate.model)
})

it('preserves graph constructor errors and requirements exactly', () => {
  expectTypeOf<
    Layer.Services<typeof Child.EffectsLayer>
  >().toEqualTypeOf<ObserveDependency>()
  expectTypeOf<
    Layer.Error<typeof Child.EffectsLayer>
  >().toEqualTypeOf<'ObserveUnavailable'>()
})

it('retains contextual update and Step inference after registration', () => {
  const update = observeComposition.makeUpdate({
    CompletedMeasure: (model, message) => {
      expectTypeOf(model).toMatchTypeOf<ChildModel>()
      expectTypeOf(message).toEqualTypeOf<
        ReturnType<typeof ChildMessage.CompletedMeasure>
      >()
      return { model }
    },
    CompletedObserve: (model, message) => {
      expectTypeOf(model).toMatchTypeOf<ChildModel>()
      expectTypeOf(message).toEqualTypeOf<
        ReturnType<typeof ChildMessage.CompletedObserve>
      >()
      return { model }
    },
  })
  const setValueStep = ChildBaseDefinition.makeStep((model, value: string) => {
    expectTypeOf(model).toEqualTypeOf<ChildModel>()
    return { model: modifyFields(model, { value: () => value }) }
  })

  expect(
    update(
      ChildModel.make({ value: 'before' }),
      ChildMessage.CompletedObserve(),
    ).model.value,
  ).toBe('before')
  expect(
    setValueStep(ChildModel.make({ value: 'before' }), 'after').model.value,
  ).toBe('after')

  if (false) {
    // @ts-expect-error Registered helpers preserve the exact Message boundary.
    update(ChildModel.make({ value: 'before' }), { _tag: 'ForeignMessage' })
    // @ts-expect-error Additional Step parameters preserve their domain type.
    setValueStep(ChildModel.make({ value: 'before' }), 1)
  }
})
