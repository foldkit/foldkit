import { Array, Context, Effect, Option, Schema, Scope, Tuple } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { makeCompositionRuntime } from '../runtime/compositionRuntime.js'
import type {
  ResolvedSlowPhaseConfig,
  SlowSubscriptionDependenciesContext,
} from '../runtime/slowPhase.js'
import { modifyFields } from '../struct/index.js'
import { initAndSet } from './bindingInit.js'
import { runBindingInitRecipe } from './initRecipe.js'
import { CurrentInstance, commandInstances } from './instanceContext.js'
import { withOperationGraph } from './operationGraph.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  CompletedInitialization: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('OptionalInitializationChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
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
const initialized = vi.fn<(count: number) => void>()
const ChildComposition = ChildDefinition.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => {
      initialized(count)
      return {
        model: ChildModel.make({ count }),
        commands: [FinishInitialization({ count })],
      }
    }),
    update: ChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      CompletedInitialization: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
    operations: {
      setCount: (count: number) =>
        Tuple.make(ChildMessage.UpdatedCount({ count })),
    },
    EffectsLayer: FinishInitialization.layer,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const Entry = Schema.Struct({ id: Schema.String, child: ChildBlock.Model })
const Model = Schema.Struct({
  maybeEntry: Schema.Option(Entry),
  label: Schema.String,
})
const Message = defineMessageUnion({
  RequestedInitialize: { id: Schema.String, count: Schema.Number },
  RequestedSetCount: { id: Schema.String, count: Schema.Number },
})
const ParentDefinition = Block.makeDefinition('OptionalInitializationParent', {
  Model,
  Message,
})
const EntryBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
})
const Composition = ParentDefinition.makeComposition({
  bindings: [EntryBinding],
})
const prepareParent = () =>
  Composition.prepareBlock({
    init: Composition.makeInit(() => ({
      model: { maybeEntry: Option.none(), label: 'initial' },
    })),
    update: Composition.makeUpdate({
      RequestedInitialize: (model, { id, count }) =>
        initAndSet(EntryBinding, model, { key: id, args: [count] }),
      RequestedSetCount: (model, { id, count }) =>
        EntryBinding.setCount(id, count)(model),
    }),
    operations: {
      initialize: (id: string, count: number) =>
        Tuple.make(Message.RequestedInitialize({ id, count })),
      setCount: (id: string, count: number) =>
        Tuple.make(Message.RequestedSetCount({ id, count })),
    },
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareParent
> = Block.assemble(prepareParent)

const noneModel = Model.make({ maybeEntry: Option.none(), label: 'retained' })

beforeEach(() => {
  initialized.mockClear()
})

describe('initAndSet keyed Option storage', () => {
  it('constructs a passive recipe and snapshots its key and arguments', () => {
    const args: [number] = [1]
    const config = { key: 'first', args }
    const recipe = initAndSet(EntryBinding, noneModel, config)
    args.splice(0, 1, 9)
    config.key = 'changed'
    config.args = Tuple.make(8)

    expect(recipe).not.toBeTypeOf('function')
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(initialized).not.toHaveBeenCalled()

    const result = withOperationGraph([EntryBinding], () =>
      runBindingInitRecipe(recipe),
    )
    expect(result).toEqual({
      model: Model.make({
        maybeEntry: Option.some({ id: 'first', child: { count: 1 } }),
        label: 'retained',
      }),
      commands: [
        expect.objectContaining({
          name: 'OptionalInitializationChild["first"]/FinishInitialization',
        }),
      ],
    })
    expect(initialized).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('creates an absent instance and replaces present instances for the supplied key', () => {
    const first = ParentBlock.operations.initialize(noneModel, 'first', 1)
    const sameKey = ParentBlock.operations.initialize(first.model, 'first', 2)
    const differentKey = ParentBlock.operations.initialize(
      sameKey.model,
      'second',
      3,
    )
    const command = Option.getOrThrow(Array.head(differentKey.commands ?? []))

    expect(first.model).toEqual(
      Model.make({
        maybeEntry: Option.some({ id: 'first', child: { count: 1 } }),
        label: 'retained',
      }),
    )
    expect(sameKey.model.maybeEntry).toEqual(
      Option.some({ id: 'first', child: { count: 2 } }),
    )
    expect(differentKey.model.maybeEntry).toEqual(
      Option.some({ id: 'second', child: { count: 3 } }),
    )
    expect(differentKey.model.label).toBe(noneModel.label)
    expect(command.name).toBe(
      'OptionalInitializationChild["second"]/FinishInitialization',
    )
    expect(commandInstances(command)).toEqual([
      { binding: EntryBinding, key: 'second', isInitialization: true },
    ])
  })

  it('does not create an absent occurrence through an ordinary child operation', () => {
    expect(ParentBlock.operations.setCount(noneModel, 'first', 9).model).toBe(
      noneModel,
    )
  })

  it('rejects an unregistered graph before child initialization', () => {
    const recipe = initAndSet(EntryBinding, noneModel, {
      key: 'first',
      args: [1],
    })
    expect(() =>
      withOperationGraph([], () => runBindingInitRecipe(recipe)),
    ).toThrow('not registered in the current Block graph')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects wrappers with additional parent-owned fields before child initialization', () => {
    const LabeledEntry = Schema.Struct({
      id: Schema.String,
      child: ChildBlock.Model,
      label: Schema.String,
    })
    const LabeledModel = Schema.Struct({
      maybeEntry: Schema.Option(LabeledEntry),
    })
    const LabeledParent = Block.makeDefinition(
      'OptionalInitializationLabeledParent',
      { Model: LabeledModel, Message: Schema.Never },
    )
    const binding = LabeledParent.makeBinding(ChildBlock, {
      field: 'maybeEntry',
      key: 'id',
      childField: 'child',
    })

    expect(() =>
      Reflect.apply(initAndSet, undefined, [
        binding,
        LabeledModel.make({ maybeEntry: Option.none() }),
        { key: 'first', args: [1] },
      ]),
    ).toThrow('without additional wrapper fields')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('reuses a same-key lifecycle and gives A after B a fresh generation', async () => {
    const first = ParentBlock.operations.initialize(noneModel, 'A', 1).model
    const sameKey = ParentBlock.operations.initialize(first, 'A', 2).model
    const second = ParentBlock.operations.initialize(sameKey, 'B', 3).model
    const replacement = ParentBlock.operations.initialize(second, 'A', 4).model
    const maybeSlowSubscriptionDependencies: Option.Option<
      ResolvedSlowPhaseConfig<
        SlowSubscriptionDependenciesContext<typeof Model.Type>
      >
    > = Option.none()

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const runtimeScope = yield* Scope.Scope
          const runtime = yield* makeCompositionRuntime({
            block: ParentBlock,
            initModel: first,
            context: Context.empty(),
            runtimeScope,
            enqueueMessage: () => {},
            crashWith: cause => Effect.failCause(cause),
            maybeSlowSubscriptionDependencies,
          })
          yield* runtime.start

          const rootNode = Context.get(runtime.context, CurrentInstance)!.node
          const firstNode = rootNode.children.get(EntryBinding)!.get('A')!
          const toRootMessage = Reflect.get(firstNode, 'toRootMessage')
          const staleMessage = Reflect.apply(toRootMessage, firstNode, [
            ChildMessage.UpdatedCount({ count: 9 }),
          ])

          runtime.synchronize(sameKey)
          const sameKeyNode = rootNode.children.get(EntryBinding)!.get('A')!
          expect(sameKeyNode).toBe(firstNode)
          expect(runtime.externalMessageGuard(staleMessage)?.()).toBe(true)

          runtime.synchronize(second)
          expect(runtime.externalMessageGuard(staleMessage)).toBeUndefined()

          runtime.synchronize(replacement)
          const replacementNode = rootNode.children.get(EntryBinding)!.get('A')!
          expect(replacementNode.generation).not.toBe(firstNode.generation)
          expect(runtime.externalMessageGuard(staleMessage)).toBeUndefined()
        }),
      ),
    )
  })
})
