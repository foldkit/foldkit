import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Scope,
  Stream,
  Tuple,
} from 'effect'
import assert from 'node:assert/strict'
import { it } from 'vitest'

import * as Message from '../message/public.js'
import {
  type CompositionRuntime,
  makeCompositionRuntime,
} from '../runtime/compositionRuntime.js'
import type {
  ResolvedSlowPhaseConfig,
  SlowSubscriptionDependenciesContext,
} from '../runtime/slowPhase.js'
import * as Struct from '../struct/public.js'
import type { BindableBlock } from './binding.js'
import { canonicalBindingOf } from './composition.js'
import { type ActiveInstance, CurrentInstance } from './instanceContext.js'
import * as Block from './public.js'
import { qualifyLayer } from './scope.js'
import { makeVariantBinding } from './variantBinding.js'

const Active = Schema.Struct({
  _tag: Schema.Literal('Active'),
  count: Schema.Number,
})
const Inactive = Schema.Struct({
  _tag: Schema.Literal('Inactive'),
  reason: Schema.String,
})
const ParentModel = Schema.Union([Active, Inactive])
const ChildMessage = Message.defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  CompletedInitialization: { count: Schema.Number },
  RequestedNotify: {},
})
const ChildOutMessage = Message.defineMessageUnion({
  NotifiedCount: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('VariantActive', {
  Model: Active,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ChildComposition = ChildDefinition.makeComposition()
const FinishInitialization = ChildDefinition.makeCommand(
  'FinishInitialization',
  {
    args: { count: Schema.Number },
    messages: [ChildMessage.CompletedInitialization],
    handler: function* () {
      return ({ count }) =>
        Effect.succeed(ChildMessage.CompletedInitialization({ count }))
    },
  },
)
const lifecycleEvents: Array<string> = []
const subscriptions = ChildDefinition.makeSubscriptions(entry => ({
  activity: entry('ObserveActivity', {
    messages: [],
    handler: function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          lifecycleEvents.push('handler acquired')
        }),
        () =>
          Effect.sync(() => {
            lifecycleEvents.push('handler released')
          }),
      )
      return () =>
        Stream.fromEffect(
          Effect.sync(() => {
            lifecycleEvents.push('stream started')
          }),
        ).pipe(
          Stream.flatMap(() => Stream.never),
          Stream.ensuring(
            Effect.sync(() => {
              lifecycleEvents.push('stream stopped')
            }),
          ),
        )
    },
  }),
}))
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => ({
      model: Active.make({ _tag: 'Active', count }),
      commands: [FinishInitialization({ count })],
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: ChildDefinition.makeFieldsStep.fromMessage(({ count }) => ({
        count: () => count,
      })),
      CompletedInitialization: ChildDefinition.makeFieldsStep.fromMessage(
        ({ count }) => ({
          count: () => count,
        }),
      ),
      RequestedNotify: ChildDefinition.makeOutMessageStep(model =>
        ChildOutMessage.NotifiedCount({ count: model.count }),
      ),
    }),
    operations: {
      setCount: (count: number) =>
        Tuple.make(ChildMessage.UpdatedCount({ count })),
      notify: () => Tuple.make(ChildMessage.RequestedNotify()),
    },
    subscriptions,
    EffectsLayer: Layer.merge(FinishInitialization.layer, subscriptions.layer),
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof Active,
  typeof prepareChild
> = Block.assemble(prepareChild)
const ParentMessage = Message.defineMessageUnion({
  RequestedSetCount: { count: Schema.Number },
  RequestedNotify: {},
})
const ParentDefinition = Block.makeDefinition('VariantParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const foldChildOutMessage = ParentDefinition.makeOutMessageFold(ChildBlock, {
  NotifiedCount: ParentDefinition.makeNoopStep,
})
const UnselectedBinding = makeVariantBinding(ParentDefinition, ChildBlock)
const ChildBinding = UnselectedBinding.withOutMessagePolicy({
  fold: foldChildOutMessage,
})
const GatedBinding = makeVariantBinding(ParentDefinition, ChildBlock, {
  placement: 'gatedActive',
  subscriptions: { when: model => model._tag === 'Active' && model.count > 0 },
  delivery: { when: model => model._tag === 'Active' && model.count > 0 },
}).withOutMessagePolicy({ fold: foldChildOutMessage })
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const initialize = ParentComposition.makeInit((count: number) =>
  ChildBinding.init({
    args: [count],
    toParentModel: child => child,
  }),
)
const update = ParentComposition.makeUpdate({
  RequestedSetCount: (model, { count }) => ChildBinding.setCount(count)(model),
  RequestedNotify: model => ChildBinding.notify()(model),
})
const prepareParent = () =>
  ParentComposition.prepareBlock({
    init: initialize,
    update,
    operations: {
      setCount: (count: number) =>
        Tuple.make(ParentMessage.RequestedSetCount({ count })),
    },
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParent
> = Block.assemble(prepareParent)

const GatedComposition = ParentDefinition.makeComposition({
  bindings: [GatedBinding],
})
const prepareGated = () =>
  GatedComposition.prepareBlock({
    init: GatedComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: GatedComposition.makeUpdate({
      RequestedSetCount: (model, { count }) =>
        GatedBinding.setCount(count)(model),
      RequestedNotify: model => GatedBinding.notify()(model),
    }),
  })
const GatedParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareGated
> = Block.assemble(prepareGated)

const first = Active.make({ _tag: 'Active', count: 1 })
const absent = Inactive.make({ _tag: 'Inactive', reason: 'signed out' })
it('keeps explicit dynamic initialization, Commands, updates, and absence identity', () => {
  const initialized = initialize(4)
  assert.deepEqual(initialized.model, Active.make({ _tag: 'Active', count: 4 }))
  assert.equal(initialized.commands!.length, 1)
  assert.equal(
    initialized.commands!.at(0)!.name,
    'VariantActive/FinishInitialization',
  )
  assert.deepEqual(
    ParentBlock.operations.setCount(first, 7).model,
    Active.make({ _tag: 'Active', count: 7 }),
  )
  assert.equal(ParentBlock.operations.setCount(absent, 7).model, absent)
  const envelope: typeof ParentBlock.Message.Type = {
    _tag: 'GotVariantActiveMessage',
    placement: 'VariantActive',
    generation: 0,
    message: ChildMessage.UpdatedCount({ count: 9 }),
  }
  assert.equal(ParentBlock.update(absent, envelope).model, absent)
  assert.deepEqual(
    ParentBlock.update(first, envelope).model,
    Active.make({ _tag: 'Active', count: 9 }),
  )
})

const tick = Effect.promise(
  () => new Promise<void>(resolve => setImmediate(resolve)),
)
const settle = Effect.gen(function* () {
  for (let index = 0; index < 5; index += 1) {
    yield* tick
  }
})
const maybeSlowSubscriptionDependencies: Option.Option<
  ResolvedSlowPhaseConfig<
    SlowSubscriptionDependenciesContext<typeof ParentModel.Type>
  >
> = Option.none()
const withRuntime = <Provided>(
  block: Omit<BindableBlock, 'EffectsLayer'> &
    Readonly<{ EffectsLayer: Layer.Layer<Provided> }>,
  model: typeof ParentModel.Type,
  test: (
    runtime: CompositionRuntime<typeof ParentModel.Type>,
    root: ActiveInstance,
  ) => Effect.Effect<void>,
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const runtimeScope = yield* Scope.Scope
        const context = yield* Layer.build(
          qualifyLayer(block.owner.id, block.EffectsLayer),
        )
        const runtime = yield* makeCompositionRuntime({
          block,
          initModel: model,
          context,
          runtimeScope,
          enqueueMessage: () => {},
          crashWith: cause => Effect.failCause(cause),
          maybeSlowSubscriptionDependencies,
        })
        yield* runtime.start
        yield* settle
        yield* test(
          runtime,
          Context.get(runtime.context, CurrentInstance)!.node,
        )
      }),
    ),
  )

const childNode = (root: ActiveInstance, binding: object): ActiveInstance => {
  const node = root.children.get(canonicalBindingOf(binding))?.get(undefined)
  if (node === undefined) {
    throw new Error('Expected a present child occurrence.')
  }
  return node
}
const toRootMessage = (
  node: ActiveInstance,
  message: typeof ChildMessage.Type,
): unknown => Reflect.apply(Reflect.get(node, 'toRootMessage'), node, [message])

it('replaces a switched variant with a new generation and rejects stale results', async () => {
  lifecycleEvents.length = 0
  await withRuntime(ParentBlock, first, (runtime, root) =>
    Effect.gen(function* () {
      const node = childNode(root, ChildBinding)
      const stale = toRootMessage(
        node,
        ChildMessage.UpdatedCount({ count: 10 }),
      )
      assert.equal(runtime.externalMessageGuard(stale)?.(), true)
      assert.deepEqual(lifecycleEvents, ['handler acquired', 'stream started'])
      runtime.synchronize(absent)
      yield* settle
      assert.equal(
        root.children.get(canonicalBindingOf(ChildBinding))?.get(undefined),
        undefined,
      )
      assert.equal(runtime.externalMessageGuard(stale), undefined)
      assert.deepEqual(lifecycleEvents, [
        'handler acquired',
        'stream started',
        'stream stopped',
      ])
      runtime.synchronize(first)
      yield* settle
      const replacement = childNode(root, ChildBinding)
      assert.notEqual(replacement.generation, node.generation)
      assert.equal(runtime.externalMessageGuard(stale), undefined)
      assert.equal(
        runtime.externalMessageGuard(
          toRootMessage(replacement, ChildMessage.UpdatedCount({ count: 11 })),
        )?.(),
        true,
      )
      assert.deepEqual(lifecycleEvents, [
        'handler acquired',
        'stream started',
        'stream stopped',
        'stream started',
      ])
    }),
  )
  assert.deepEqual(lifecycleEvents.slice(-2), [
    'stream stopped',
    'handler released',
  ])
})

it('gates Subscription Streams without changing variant membership', async () => {
  lifecycleEvents.length = 0
  const zero = Active.make({ _tag: 'Active', count: 0 })
  await withRuntime(GatedParentBlock, zero, (runtime, root) =>
    Effect.gen(function* () {
      const node = childNode(root, GatedBinding)
      assert.ok(node)
      assert.deepEqual(lifecycleEvents, ['handler acquired'])
      runtime.synchronize(first)
      yield* settle
      assert.equal(childNode(root, GatedBinding), node)
      assert.deepEqual(lifecycleEvents, ['handler acquired', 'stream started'])
      runtime.synchronize(zero)
      yield* settle
      assert.equal(childNode(root, GatedBinding), node)
      assert.deepEqual(lifecycleEvents, [
        'handler acquired',
        'stream started',
        'stream stopped',
      ])
      runtime.synchronize(absent)
      yield* settle
      assert.equal(
        root.children.get(canonicalBindingOf(GatedBinding))?.get(undefined),
        undefined,
      )
      assert.deepEqual(lifecycleEvents, [
        'handler acquired',
        'stream started',
        'stream stopped',
      ])
    }),
  )
})

it('rejects erased ineligible Schemas and mixed configuration', () => {
  const invalidModels = [
    Schema.Union([Schema.Struct({ count: Schema.Number }), Inactive]),
    Schema.Union([
      Schema.Struct({ _tag: Schema.String, count: Schema.Number }),
      Inactive,
    ]),
    Schema.Union([
      Schema.Struct({
        _tag: Schema.optionalKey(Schema.Literal('Active')),
        count: Schema.Number,
      }),
      Inactive,
    ]),
    Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('Other'), count: Schema.Number }),
      Inactive,
    ]),
    Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('Active'), count: Schema.String }),
      Inactive,
    ]),
    Schema.Union([
      Schema.Struct({
        _tag: Schema.Literal('Active'),
        count: Schema.Number,
        session: Schema.String,
      }),
      Inactive,
    ]),
    Schema.Union([
      Schema.Struct({ _tag: Schema.Literal('Active'), child: Active }),
      Inactive,
    ]),
    Schema.Union([
      Active,
      Schema.Struct({
        _tag: Schema.Literal('Active'),
        count: Schema.Number,
        session: Schema.String,
      }),
      Inactive,
    ]),
    Schema.Union([Active, Active, Inactive]),
    Schema.Struct({ slot: ParentModel }),
  ]
  for (const [index, Model] of invalidModels.entries()) {
    const definition = Block.makeDefinition(`ErasedInvalid${index}`, {
      Model,
      Message: Schema.Never,
    })
    assert.throws(
      () =>
        Reflect.apply(makeVariantBinding, undefined, [definition, ChildBlock]),
      /Variant Binding/,
      `invalid parent ${index}`,
    )
  }
  for (const config of [
    { read: () => Option.none() },
    { write: (model: unknown) => model },
    { field: 'child' },
    { key: 'id' },
    { presentWhen: () => false },
    { init: { args: [0] } },
    { subscriptions: { when: { missing: () => true } } },
  ]) {
    assert.throws(
      () =>
        Reflect.apply(makeVariantBinding, undefined, [
          ParentDefinition,
          ChildBlock,
          config,
        ]),
      /Variant Binding|Subscription/,
      `invalid config ${Object.keys(config)}`,
    )
  }
  const rebuilt = Schema.Struct({
    _tag: Schema.Literal('Active'),
    count: Schema.Number,
  })
  const constrained = Schema.Struct({
    _tag: Schema.Literal('Active'),
    count: Schema.Number.check(Schema.isGreaterThan(0)),
  })
  for (const [index, member] of [rebuilt, constrained].entries()) {
    const definition = Block.makeDefinition(`SameTypeDifferentSchema${index}`, {
      Model: Schema.Union([member, Inactive]),
      Message: Schema.Never,
    })
    assert.throws(
      () =>
        Reflect.apply(makeVariantBinding, undefined, [definition, ChildBlock]),
      /include the child Block.Model Schema itself/,
    )
  }
})

it('does not start an absent variant', async () => {
  lifecycleEvents.length = 0
  await withRuntime(ParentBlock, absent, (_runtime, root) =>
    Effect.sync(() => {
      assert.equal(
        root.children.get(canonicalBindingOf(ChildBinding))?.size ?? 0,
        0,
      )
      assert.deepEqual(lifecycleEvents, ['handler acquired'])
    }),
  )
  assert.deepEqual(lifecycleEvents, ['handler acquired', 'handler released'])
})

it('preserves native parent Definition registration', () => {
  const foreign = Block.makeDefinition('ForeignVariantParent', {
    Model: ParentModel,
    Message: ParentMessage,
  })
  assert.throws(
    () => foreign.makeComposition({ bindings: [ChildBinding] }),
    /another|different|Definition/,
  )
})

const ContextComposition = Block.makeDefinition('VariantContextChild', {
  Model: Active,
  Message: ChildMessage,
}).makeComposition()
const prepareContextChild = () =>
  ContextComposition.prepareBlock({
    init: ContextComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 0 }),
    })),
    update: ContextComposition.makeUpdate.withContext((amount: number) => ({
      UpdatedCount: (model, { count }) => ({
        model: Struct.modifyFields(model, { count: () => count + amount }),
      }),
      CompletedInitialization: model => ({ model }),
      RequestedNotify: model => ({ model }),
    })),
  })
const ContextChild: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Active,
  typeof prepareContextChild
> = Block.assemble(prepareContextChild)
const ContextBinding = makeVariantBinding(ParentDefinition, ContextChild, {
  delivery: {
    toUpdateContext: model =>
      Tuple.make(model._tag === 'Active' ? model.count : 0),
  },
})

const ContextParentComposition = ParentDefinition.makeComposition({
  bindings: [ContextBinding],
})
const prepareContextParent = () =>
  ContextParentComposition.prepareBlock({
    init: ContextParentComposition.makeInit(() => ({
      model: Active.make({ _tag: 'Active', count: 1 }),
    })),
    update: ContextParentComposition.makeUpdate({
      RequestedSetCount: ParentDefinition.makeNoopStep(),
      RequestedNotify: ParentDefinition.makeNoopStep(),
    }),
  })
const ContextParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareContextParent
> = Block.assemble(prepareContextParent)
it('maps the current whole parent Model to exact child delivery context', () => {
  const message: typeof ContextParentBlock.Message.Type = {
    _tag: 'GotVariantContextChildMessage',
    placement: 'VariantContextChild',
    generation: 0,
    message: ChildMessage.UpdatedCount({ count: 4 }),
  }
  assert.deepEqual(
    ContextParentBlock.update(first, message).model,
    Active.make({ _tag: 'Active', count: 5 }),
  )
  assert.equal(ContextParentBlock.update(absent, message).model, absent)
})
it('gates generated delivery while the variant remains present', () => {
  const zero = Active.make({ _tag: 'Active', count: 0 })
  const message: typeof GatedParentBlock.Message.Type = {
    _tag: 'GotGatedActiveMessage',
    placement: 'gatedActive',
    generation: 0,
    message: ChildMessage.UpdatedCount({ count: 9 }),
  }
  assert.equal(GatedParentBlock.update(zero, message).model, zero)
  assert.deepEqual(
    GatedParentBlock.update(first, message).model,
    Active.make({ _tag: 'Active', count: 9 }),
  )
})
it('rejects erased malformed nested option records', () => {
  for (const invalid of [null, [], 1, () => true, new Date()]) {
    for (const config of [
      invalid,
      { subscriptions: invalid },
      { delivery: invalid },
    ]) {
      assert.throws(
        () =>
          Reflect.apply(makeVariantBinding, undefined, [
            ParentDefinition,
            ChildBlock,
            config,
          ]),
        /Variant Binding.*object record/,
      )
    }
  }
  for (const config of [
    { subscriptions: { extra: true } },
    { delivery: { extra: true } },
    { subscriptions: { when: { layer: () => true } } },
    { subscriptions: { when: new Date() } },
    { subscriptions: { when: [] } },
    { subscriptions: { when: null } },
    { subscriptions: { when: { activity: 1 } } },
    { delivery: { when: 1 } },
    { delivery: { toUpdateContext: 1 } },
  ]) {
    assert.throws(
      () =>
        Reflect.apply(makeVariantBinding, undefined, [
          ParentDefinition,
          ChildBlock,
          config,
        ]),
      /Variant Binding/,
    )
  }
})
