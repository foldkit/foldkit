import { Context, Effect, Layer, Number, Schema, Stream } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import type * as Subscription from 'foldkit/subscription'
import * as Update from 'foldkit/update'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const PreparationFailure = Schema.Struct({
  _tag: Schema.Literal('PreparationFailure'),
  reason: Schema.String,
})
export type PreparationFailure = typeof PreparationFailure.Type

export class CountStore extends Context.Service<
  CountStore,
  Readonly<{
    prepare: Effect.Effect<void, PreparationFailure>
    read: Effect.Effect<number>
  }>
>()('GeneratedDispatch/CountStore') {}

export const ChildModel = Schema.Struct({ count: Schema.Number })
export const ChildMessage = defineMessageUnion({
  ClickedIncrement: {},
  RequestedReadCount: {},
  RequestedSetCount: { count: Schema.Number },
  CompletedReadCount: { count: Schema.Number },
  ObservedCount: { count: Schema.Number },
})
export const GeneratedDispatchChildDefinition = Block.makeDefinition(
  'GeneratedDispatchChild',
  { Model: ChildModel, Message: ChildMessage },
)
export const ReadCount = GeneratedDispatchChildDefinition.makeCommand(
  'ReadCount',
  {
    messages: [ChildMessage.CompletedReadCount],
    handler: function* () {
      const store = yield* CountStore
      yield* store.prepare

      return () =>
        store.read.pipe(
          Effect.map(count => ChildMessage.CompletedReadCount({ count })),
        )
    },
  },
)
export const childSubscriptions =
  GeneratedDispatchChildDefinition.makeSubscriptions(entry => ({
    observations: entry('Observations', {
      messages: [ChildMessage.ObservedCount],
      handler: function* () {
        return () => Stream.never
      },
    }),
  }))
export const GeneratedDispatchChildComposition =
  GeneratedDispatchChildDefinition.makeComposition()
export const childSceneSubscriptions = Scene.subscriptions(
  GeneratedDispatchChildComposition,
  childSubscriptions,
)
export const childInit = GeneratedDispatchChildComposition.makeInit(() => ({
  model: { count: 0 },
  commands: [ReadCount()],
}))
export const childUpdate = GeneratedDispatchChildComposition.makeUpdate({
  ClickedIncrement: model => ({
    model: modifyFields(model, {
      count: Number.increment,
    }),
  }),
  RequestedReadCount: model => ({ model, commands: [ReadCount()] }),
  RequestedSetCount: (model, { count }) => ({
    model: ChildModel.make({ count }),
  }),
  CompletedReadCount: (model, { count }) => ({
    model: ChildModel.make({ count }),
  }),
  ObservedCount: (model, { count }) => ({
    model: ChildModel.make({ count }),
  }),
})
export const childView = GeneratedDispatchChildComposition.makeView(
  (model, h) =>
    h.button(
      [h.OnClick(ChildMessage.ClickedIncrement())],
      [globalThis.String(model.count)],
    ),
)
export const prepareGeneratedDispatchChildBlock = () =>
  GeneratedDispatchChildComposition.prepareBlock({
    init: childInit,
    update: childUpdate,
    view: childView,
    subscriptions: childSubscriptions,
    operations: {
      requestReadCount: ChildMessage.RequestedReadCount,
      requestSetCount: ChildMessage.RequestedSetCount,
    },
    EffectsLayer: Layer.merge(
      ReadCount.layer,
      childSubscriptions.observations.layer,
    ),
  })

export const RawGeneratedDispatchChildBlock: CompletedAssembly<
  typeof prepareGeneratedDispatchChildBlock
> = Block.assemble(prepareGeneratedDispatchChildBlock)
export const GeneratedDispatchChildBlock: Block.FromAssemblyWithView<
  typeof GeneratedDispatchChildComposition.Model,
  typeof prepareGeneratedDispatchChildBlock
> = Block.assemble(prepareGeneratedDispatchChildBlock)

export const ParentModel = Schema.Struct({
  child: GeneratedDispatchChildBlock.Model,
  title: Schema.String,
})
export const ParentMessage = defineMessageUnion({
  ChangedTitle: { title: Schema.String },
})
export const GeneratedDispatchParentDefinition = Block.makeDefinition(
  'GeneratedDispatchParent',
  { Model: ParentModel, Message: ParentMessage },
)
export const ChildBinding = GeneratedDispatchParentDefinition.makeBinding(
  GeneratedDispatchChildBlock,
  { field: 'child' },
)
export const GeneratedDispatchParentComposition =
  GeneratedDispatchParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
export const parentInit = GeneratedDispatchParentComposition.makeInit(() => ({
  model: { title: 'Counts' },
  steps: [ChildBinding.requestSetCount({ count: 1 })],
}))
export const parentUpdate = GeneratedDispatchParentComposition.makeUpdate({
  ChangedTitle: (model, { title }) => ({
    model: modifyFields(model, {
      title: () => title,
    }),
  }),
})
export const setChildCount = GeneratedDispatchParentComposition.makeUpdate({
  ChangedTitle: (model, { title }) =>
    ChildBinding.requestSetCount({ count: title.length })(model),
})
export const parentView = GeneratedDispatchParentComposition.makeView(
  (model, h) =>
    h.section(
      [],
      [
        model.title,
        h.block(
          ChildBinding.embedView({ slotId: 'child', model: model.child }),
        ),
      ],
    ),
)
export const prepareGeneratedDispatchParentBlock = () =>
  GeneratedDispatchParentComposition.prepareBlock({
    init: parentInit,
    update: parentUpdate,
    view: parentView,
  })

export const RawGeneratedDispatchParentBlock: CompletedAssembly<
  typeof prepareGeneratedDispatchParentBlock
> = Block.assemble(prepareGeneratedDispatchParentBlock)
export const GeneratedDispatchParentBlock: Block.FromAssemblyWithView<
  typeof GeneratedDispatchParentComposition.Model,
  typeof prepareGeneratedDispatchParentBlock
> = Block.assemble(prepareGeneratedDispatchParentBlock)

export const simulateChildObservations = () =>
  Scene.scene(
    {
      update: parentUpdate,
      view: parentView,
      subscriptions: GeneratedDispatchParentBlock.subscriptions,
    },
    Scene.given(ParentModel.make({ child: { count: 0 }, title: 'Counts' })),
    Scene.Subscription.emit(
      childSubscriptions.observations,
      ChildMessage.ObservedCount({ count: 1 }),
    ),
    Scene.expect(Scene.role('button')).toHaveText('1'),
  )

export const Model = Schema.Struct({
  parent: GeneratedDispatchParentBlock.Model,
})
export const Message = defineMessageUnion({ ClickedApplication: {} })
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
export const ParentBinding = ApplicationDefinition.makeBinding(
  GeneratedDispatchParentBlock,
  { field: 'parent' },
)
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ParentBinding],
})
export const sceneSubscriptions = Scene.subscriptions(ApplicationComposition)
export const init = ApplicationComposition.makeInit(() => ({ model: {} }))
export const update = ApplicationComposition.makeUpdate({
  ClickedApplication: model => ({ model }),
})
export const view = ApplicationComposition.makeView((model, h) =>
  h.main(
    [],
    [
      h.block(
        ParentBinding.embedView({ slotId: 'parent', model: model.parent }),
      ),
    ],
  ),
)
export const prepareApplicationBlock = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
  })

export const RawApplicationBlock: CompletedAssembly<
  typeof prepareApplicationBlock
> = Block.assemble(prepareApplicationBlock)
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof ApplicationComposition.Model,
  typeof prepareApplicationBlock
> = Block.assemble(prepareApplicationBlock)

export const element = Program.makeElement({
  block: ApplicationBlock,
  container: null,
  devTools: { dispatch: true },
})
export const CountStoreLayer = Layer.succeed(CountStore, {
  prepare: Effect.void,
  read: Effect.succeed(2),
})
export const providedElement = element.provide(CountStoreLayer)

export type LocalFactsRemainLocal = Expect<
  Equal<(typeof ParentMessage.Type)['_tag'], 'ChangedTitle'>
>
export type CompleteParentDispatch = Expect<
  Equal<
    (typeof GeneratedDispatchParentBlock.Message.Type)['_tag'],
    'ChangedTitle' | 'GotChildMessage'
  >
>
export type CompleteApplicationDispatch = Expect<
  Equal<
    (typeof ApplicationComposition.Message.Type)['_tag'],
    'ClickedApplication' | 'GotParentMessage'
  >
>
export type ExactChildSceneSubscriptionKeys = Expect<
  Equal<keyof typeof childSceneSubscriptions, 'observations'>
>
export type ExactSceneSubscriptionKeys = Expect<
  Equal<keyof typeof sceneSubscriptions, 'parent/child/observations'>
>
export type ExactSceneSubscriptionRequirements = Expect<
  Equal<
    Stream.Services<
      ReturnType<
        (typeof sceneSubscriptions)['parent/child/observations']['dependenciesToStream']
      >
    >,
    Block.Qualify<
      'parent/child',
      Subscription.HandlerOf<typeof childSubscriptions.observations>
    >
  >
>
export type InitCommandRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof parentInit>,
    Block.Qualify<'child', Command.HandlerOf<typeof ReadCount>>
  >
>
export type ConstructorErrorsRemainExact = Expect<
  Equal<
    Layer.Error<typeof GeneratedDispatchParentBlock.EffectsLayer>,
    PreparationFailure
  >
>
export type OrdinaryServicesRemainExact = Expect<
  Equal<
    Layer.Services<typeof GeneratedDispatchParentBlock.EffectsLayer>,
    CountStore
  >
>

type CompletedAssembly<Producer extends () => Block.AssemblyDraft<object>> =
  ReturnType<Producer> extends Block.AssemblyDraft<infer Completed>
    ? Completed
    : never
