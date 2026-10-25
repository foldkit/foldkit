import { Context, Effect, Layer, Option, Schema, Scope, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import {
  makeChildEnvelopeSchema,
  registerGeneratedDelivery,
} from '../block/childEnvelope.js'
import { runtimeBindingOf } from '../block/composition.js'
import { makeNamespace } from '../block/define.js'
import { CurrentInstance } from '../block/instanceContext.js'
import * as Block from '../block/public.js'
import {
  invocationContext,
  qualifyCommand,
  qualifyLayer,
} from '../block/scope.js'
import {
  clearRuntime,
  requireRuntimeContext,
  setRuntime,
} from '../html/runtimeSingleton.js'
import type { ResourceNotAvailable } from '../managedResource/managedResource.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { makeCompositionRuntime } from './compositionRuntime.js'
import type { SlowSubscriptionDependenciesContext } from './slowPhase.js'

const ChildOwnerNamespace = makeNamespace('LifecycleChild')
const ChildModel = Schema.Struct({ id: Schema.Number })
const ChildMessage = defineMessageUnion({ EmittedPulse: {} })
const ChildValue = ChildOwnerNamespace.makeResource<string>()('Value')
class LifecycleLog extends Context.Service<
  LifecycleLog,
  Readonly<{
    started: (id: number) => void
    stopped: (id: number) => void
    acquiredResource: (value: string) => void
    releaseResource: (value: string) => Effect.Effect<void>
  }>
>()('CompositionRuntime/LifecycleLog') {}
const ChildDefinition = ChildOwnerNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
})
const subscriptions = ChildDefinition.makeSubscriptions(entry => ({
  pulses: entry(
    'Pulses',
    { id: Schema.Number },
    {
      messages: [ChildMessage.EmittedPulse],
      modelToDependencies: model => ({ id: model.id }),
      handler: function* () {
        const log = yield* LifecycleLog

        return ({ id }) =>
          Stream.callback<never>(() =>
            Effect.acquireRelease(
              Effect.sync(() => log.started(id)),
              () => Effect.sync(() => log.stopped(id)),
            ).pipe(Effect.andThen(Effect.never)),
          )
      },
    },
  ),
}))
const childManagedResources = ChildDefinition.makeManagedResources(entry => ({
  value: entry('Value', Schema.Option(Schema.Struct({ id: Schema.Number })), {
    resource: ChildValue,
    modelToMaybeRequirements: model => Option.some({ id: model.id }),
    onAcquired: () => ChildMessage.EmittedPulse(),
    onReleased: () => ChildMessage.EmittedPulse(),
    onAcquireError: () => ChildMessage.EmittedPulse(),
    handler: function* () {
      const log = yield* LifecycleLog

      return {
        acquire: ({ id }) =>
          Effect.sync(() => {
            const value = `child:${id}`
            log.acquiredResource(value)
            return value
          }),
        release: value => log.releaseResource(value),
      }
    },
  }),
}))
const childComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  childComposition.prepareBlock({
    init: (id: number) => ({ model: { id } }),
    update: childComposition.makeUpdate({
      EmittedPulse: model => ({ model }),
    }),
    subscriptions,
    managedResources: childManagedResources,
    EffectsLayer: Layer.merge(
      subscriptions.pulses.layer,
      childManagedResources.value.layer,
    ),
  })
const childBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const RootNamespace = makeNamespace('LifecycleApp')
const RootValue = RootNamespace.makeResource<string>()('Value')
const RootModel = Schema.Struct({
  maybeChild: Schema.Option(ChildModel),
  entries: Schema.Array(ChildModel),
  subscriptionState: Schema.Literals(['Active', 'Paused']),
})
type RootModel = typeof RootModel.Type
const RootMessage = defineMessageUnion({
  ChangedRootValueAvailability: {},
})
const RootBaseDefinition = RootNamespace.makeDefinition({
  Model: RootModel,
  Message: RootMessage,
})
const OptionalChildBinding = RootBaseDefinition.makeBinding(childBlock, {
  read: (model: RootModel) => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  subscriptions: { when: model => model.subscriptionState === 'Active' },
})
const EntriesBinding = RootBaseDefinition.makeBinding(childBlock, {
  placement: 'Entries',
  readAll: (model: RootModel) => model.entries,
  key: entry => entry.id,
  read: entry => entry,
  writeAt: (model, key: number, nextChild) =>
    modifyFields(model, {
      entries: entries =>
        entries.map(entry => (entry.id === key ? nextChild : entry)),
    }),
  keySchema: Schema.Number,
})
const root = RootBaseDefinition.makeComposition({
  bindings: [OptionalChildBinding, EntriesBinding],
})
const rootManagedResources = RootBaseDefinition.makeManagedResources(entry => ({
  value: entry('Value', Schema.Option(Schema.Null), {
    resource: RootValue,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => RootMessage.ChangedRootValueAvailability(),
    onReleased: () => RootMessage.ChangedRootValueAvailability(),
    onAcquireError: () => RootMessage.ChangedRootValueAvailability(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('root'),
        release: () => Effect.void,
      }
    },
  }),
}))
const initialModel = RootModel.make({
  maybeChild: Option.some({ id: 1 }),
  entries: [],
  subscriptionState: 'Active',
})
const prepareBlock = () =>
  root.prepareBlock({
    init: () => ({ model: initialModel }),
    update: root.makeUpdate({
      ChangedRootValueAvailability: model => ({ model }),
    }),
    managedResources: rootManagedResources,
    EffectsLayer: rootManagedResources.value.layer,
  })
const block: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RootModel,
  typeof prepareBlock
> = Block.assemble(prepareBlock)

const NestedParentNamespace = makeNamespace('NestedLifecycleParent')
const NestedParentModel = Schema.Struct({
  id: Schema.Number,
  entries: Schema.Array(ChildModel),
})
type NestedParentModel = typeof NestedParentModel.Type
const NestedParentBaseDefinition = NestedParentNamespace.makeDefinition({
  Model: NestedParentModel,
  Message: Schema.Never,
})
const NestedEntriesBinding = NestedParentBaseDefinition.makeBinding(
  childBlock,
  {
    placement: 'entries',
    readAll: (model: NestedParentModel) => model.entries,
    key: (entry): number => entry.id,
    read: entry => entry,
    writeAt: (model, key, nextChild) =>
      modifyFields(model, {
        entries: entries =>
          entries.map(entry => (entry.id === key ? nextChild : entry)),
      }),
    keySchema: Schema.Number,
  },
)
const nestedParent = NestedParentBaseDefinition.makeComposition({
  bindings: [NestedEntriesBinding],
})
const prepareNestedParentBlock = () =>
  nestedParent.prepareBlock({
    init: (id: number, entries: ReadonlyArray<typeof ChildModel.Type>) => ({
      model: { id, entries },
    }),
    update: nestedParent.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const nestedParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof NestedParentModel,
  typeof prepareNestedParentBlock
> = Block.assemble(prepareNestedParentBlock)
const NestedRootNamespace = makeNamespace('NestedLifecycleApp')
const NestedRootModel = Schema.Struct({
  parents: Schema.Array(NestedParentModel),
})
type NestedRootModel = typeof NestedRootModel.Type
const NestedRootBaseDefinition = NestedRootNamespace.makeDefinition({
  Model: NestedRootModel,
  Message: Schema.Never,
})
const NestedParentsBinding = NestedRootBaseDefinition.makeBinding(
  nestedParentBlock,
  {
    placement: 'parents',
    readAll: (model: NestedRootModel) => model.parents,
    key: (parent): number => parent.id,
    read: parent => parent,
    writeAt: (model, key: number, nextParent) =>
      modifyFields(model, {
        parents: parents =>
          parents.map(parent => (parent.id === key ? nextParent : parent)),
      }),
    keySchema: Schema.Number,
  },
)
const nestedRoot = NestedRootBaseDefinition.makeComposition({
  bindings: [NestedParentsBinding],
})
const nestedInitialModel = NestedRootModel.make({
  parents: [{ id: 1, entries: [{ id: 10 }] }],
})
const prepareNestedBlock = () =>
  nestedRoot.prepareBlock({
    init: () => ({ model: nestedInitialModel }),
    update: nestedRoot.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const nestedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof NestedRootModel,
  typeof prepareNestedBlock
> = Block.assemble(prepareNestedBlock)

registerGeneratedDelivery(
  OptionalChildBinding,
  makeChildEnvelopeSchema(OptionalChildBinding.placement, ChildMessage),
)
registerGeneratedDelivery(
  EntriesBinding,
  makeChildEnvelopeSchema(
    EntriesBinding.placement,
    ChildMessage,
    Schema.Number,
  ),
)
registerGeneratedDelivery(
  NestedEntriesBinding,
  makeChildEnvelopeSchema(
    NestedEntriesBinding.placement,
    ChildMessage,
    Schema.Number,
  ),
)
registerGeneratedDelivery(
  NestedParentsBinding,
  makeChildEnvelopeSchema(
    NestedParentsBinding.placement,
    nestedParentBlock.Message,
    Schema.Number,
  ),
)

const withRuntime = (
  run: (
    runtime: Effect.Success<
      ReturnType<
        typeof makeCompositionRuntime<RootModel, typeof RootMessage.Type>
      >
    >,
    log: Readonly<{
      starts: Array<number>
      stops: Array<number>
      acquiredResources: Array<string>
      releasedResources: Array<string>
      slow: Array<SlowSubscriptionDependenciesContext<RootModel>>
      messages: Array<unknown>
    }>,
  ) => Promise<void>,
  control?: Readonly<{
    waitForResourceRelease: (value: string) => Effect.Effect<void>
  }>,
) => {
  const starts: Array<number> = []
  const stops: Array<number> = []
  const acquiredResources: Array<string> = []
  const releasedResources: Array<string> = []
  const slow: Array<SlowSubscriptionDependenciesContext<RootModel>> = []
  const messages: Array<unknown> = []
  const services = Layer.succeed(LifecycleLog, {
    started: id => {
      starts.push(id)
    },
    stopped: id => {
      stops.push(id)
    },
    acquiredResource: value => {
      acquiredResources.push(value)
    },
    releaseResource: value =>
      Effect.sync(() => {
        releasedResources.push(value)
      }).pipe(
        Effect.andThen(control?.waitForResourceRelease(value) ?? Effect.void),
      ),
  })
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const runtimeScope = yield* Scope.Scope
        const built = yield* Layer.build(
          qualifyLayer(block.owner.id, block.EffectsLayer).pipe(
            Layer.provideMerge(services),
          ),
        )
        const runtime = yield* makeCompositionRuntime<
          RootModel,
          typeof RootMessage.Type
        >({
          block: block,
          initModel: initialModel,
          context: Context.makeUnsafe<never>(built.mapUnsafe),
          runtimeScope,
          enqueueMessage: message => {
            messages.push(message)
          },
          crashWith: cause => Effect.failCause(cause),
          maybeSlowSubscriptionDependencies: Option.some({
            thresholdMs: -1,
            onSlow: context => {
              slow.push(context)
            },
          }),
        })
        yield* runtime.start
        yield* Effect.promise(() =>
          run(runtime, {
            starts,
            stops,
            acquiredResources,
            releasedResources,
            slow,
            messages,
          }),
        )
      }),
    ),
  )
}

const withNestedRuntime = (
  run: (
    runtime: Effect.Success<
      ReturnType<
        typeof makeCompositionRuntime<
          NestedRootModel,
          typeof nestedBlock.Message.Type
        >
      >
    >,
    log: Readonly<{
      acquiredResources: Array<string>
      releasedResources: Array<string>
    }>,
  ) => Promise<void>,
  waitForResourceRelease: (value: string) => Effect.Effect<void>,
) => {
  const acquiredResources: Array<string> = []
  const releasedResources: Array<string> = []
  const services = Layer.succeed(LifecycleLog, {
    started: () => {},
    stopped: () => {},
    acquiredResource: value => {
      acquiredResources.push(value)
    },
    releaseResource: value =>
      Effect.sync(() => {
        releasedResources.push(value)
      }).pipe(Effect.andThen(waitForResourceRelease(value))),
  })
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const runtimeScope = yield* Scope.Scope
        const built = yield* Layer.build(
          qualifyLayer(nestedBlock.owner.id, nestedBlock.EffectsLayer).pipe(
            Layer.provideMerge(services),
          ),
        )
        const runtime = yield* makeCompositionRuntime<
          NestedRootModel,
          typeof nestedBlock.Message.Type
        >({
          block: nestedBlock,
          initModel: nestedInitialModel,
          context: Context.makeUnsafe<never>(built.mapUnsafe),
          runtimeScope,
          enqueueMessage: () => {},
          crashWith: cause => Effect.failCause(cause),
          maybeSlowSubscriptionDependencies: Option.none(),
        })
        yield* runtime.start
        yield* Effect.promise(() =>
          run(runtime, { acquiredResources, releasedResources }),
        )
      }),
    ),
  )
}

describe('composed lifecycle reconciliation', () => {
  it('uses each parent snapshot for gates and preserves root profiling context', async () => {
    await withRuntime(async (runtime, { starts, stops, slow }) => {
      await vi.waitFor(() => expect(starts).toEqual([1]))
      slow.length = 0
      const paused = modifyFields(initialModel, {
        subscriptionState: () => 'Paused',
      })
      runtime.synchronize(paused)
      runtime.synchronize(initialModel)
      runtime.synchronize(paused)
      await vi.waitFor(() => {
        expect(stops).toEqual([1])
        expect(slow.map(context => context.model.subscriptionState)).toEqual([
          'Paused',
          'Active',
          'Paused',
        ])
      })
      expect(slow.map(context => context.subscriptionKey)).toEqual([
        'LifecycleApp/LifecycleChild/pulses',
        'LifecycleApp/LifecycleChild/pulses',
        'LifecycleApp/LifecycleChild/pulses',
      ])
      runtime.synchronize(initialModel)
      await vi.waitFor(() => expect(starts).toEqual([1, 1]))
      runtime.synchronize(
        modifyFields(initialModel, { maybeChild: () => Option.none() }),
      )
      await vi.waitFor(() => expect(stops).toEqual([1, 1]))
      runtime.synchronize(initialModel)
      await vi.waitFor(() => expect(starts).toEqual([1, 1, 1]))
    })
  })

  it('rejects invalid keys before mutating any occurrence or starting new work', async () => {
    await withRuntime(async (runtime, { starts, stops }) => {
      await vi.waitFor(() => expect(starts).toEqual([1]))
      const before = Context.get(runtime.context, CurrentInstance)!.node
      const optionalBefore = before.children
        .get(OptionalChildBinding)!
        .get(undefined)
      const invalidKeyEntries = [true, {}, globalThis.BigInt(1), undefined].map(
        invalidKey => {
          const entry = { id: 1 }
          Reflect.set(entry, 'id', invalidKey)
          return [entry]
        },
      )
      for (const invalidEntries of [
        [{ id: 2 }, { id: 2 }],
        [{ id: Number.NaN }],
        [{ id: Number.POSITIVE_INFINITY }],
        ...invalidKeyEntries,
      ]) {
        expect(() =>
          runtime.synchronize(
            modifyFields(initialModel, {
              maybeChild: () => Option.none(),
              entries: () => invalidEntries,
            }),
          ),
        ).toThrow(
          /duplicate key|does not satisfy its key Schema|string or finite number keys/,
        )
        expect(before.children.get(OptionalChildBinding)!.get(undefined)).toBe(
          optionalBefore,
        )
        expect(optionalBefore!.isActive).toBe(true)
        expect(before.children.get(EntriesBinding)!.size).toBe(0)
      }
      expect(starts).toEqual([1])
      expect(stops).toEqual([])
      expect(runtimeBindingOf(EntriesBinding).block).toBe(childBlock)
    })
  })

  it('finishes the prior occurrence cleanup before starting its replacement', async () => {
    let finishFirstRelease: (() => void) | undefined
    const firstRelease = new Promise<void>(resolve => {
      finishFirstRelease = resolve
    })

    await withRuntime(
      async (runtime, { acquiredResources, releasedResources }) => {
        await vi.waitFor(() => expect(acquiredResources).toEqual(['child:1']))

        runtime.synchronize(
          modifyFields(initialModel, { entries: () => [{ id: 10 }] }),
        )
        await vi.waitFor(() =>
          expect(acquiredResources).toEqual(['child:1', 'child:10']),
        )

        runtime.synchronize(initialModel)
        await vi.waitFor(() => expect(releasedResources).toEqual(['child:10']))

        runtime.synchronize(
          modifyFields(initialModel, {
            entries: () => [{ id: 10 }, { id: 11 }],
          }),
        )
        await vi.waitFor(() =>
          expect(acquiredResources).toEqual([
            'child:1',
            'child:10',
            'child:11',
          ]),
        )

        runtime.synchronize(
          modifyFields(initialModel, {
            entries: () => [{ id: 11 }],
          }),
        )
        runtime.synchronize(
          modifyFields(initialModel, {
            entries: () => [{ id: 10 }, { id: 11 }],
          }),
        )
        expect(acquiredResources).toEqual(['child:1', 'child:10', 'child:11'])

        finishFirstRelease!()
        await vi.waitFor(() =>
          expect(acquiredResources).toEqual([
            'child:1',
            'child:10',
            'child:11',
            'child:10',
          ]),
        )
      },
      {
        waitForResourceRelease: value =>
          value === 'child:10'
            ? Effect.promise(() => firstRelease)
            : Effect.void,
      },
    )
  })

  it('retains detached descendant cleanup through parent replacement', async () => {
    let finishRelease: (() => void) | undefined
    const release = new Promise<void>(resolve => {
      finishRelease = resolve
    })

    await withNestedRuntime(
      async (runtime, { acquiredResources, releasedResources }) => {
        await vi.waitFor(() => expect(acquiredResources).toEqual(['child:10']))

        runtime.synchronize({
          parents: [{ id: 1, entries: [] }],
        })
        await vi.waitFor(() => expect(releasedResources).toEqual(['child:10']))

        runtime.synchronize({ parents: [] })
        runtime.synchronize({
          parents: [
            { id: 1, entries: [{ id: 10 }] },
            { id: 2, entries: [{ id: 20 }] },
          ],
        })
        await vi.waitFor(() => expect(acquiredResources).toContain('child:20'))
        expect(
          acquiredResources.filter(value => value === 'child:10'),
        ).toHaveLength(1)

        finishRelease!()
        await vi.waitFor(() =>
          expect(
            acquiredResources.filter(value => value === 'child:10'),
          ).toHaveLength(2),
        )
      },
      value =>
        value === 'child:10' ? Effect.promise(() => release) : Effect.void,
    )
  })

  it('uses render-owned historical instances with unavailable resource slots', async () => {
    await withRuntime(async runtime => {
      const liveRoot = Context.get(runtime.context, CurrentInstance)!.node
      const liveChild = liveRoot.children
        .get(OptionalChildBinding)!
        .get(undefined)!
      const liveRootContext = invocationContext(block.owner.id, runtime.context)
      const liveChildContext = invocationContext(
        OptionalChildBinding.placement,
        runtime.context,
        { binding: OptionalChildBinding },
      )

      await vi.waitFor(async () => {
        await expect(
          Effect.runPromise(
            RootValue.get.pipe(Effect.provide(liveRootContext)),
          ),
        ).resolves.toBe('root')
        await expect(
          Effect.runPromise(
            ChildValue.get.pipe(Effect.provide(liveChildContext)),
          ),
        ).resolves.toBe('child:1')
      })

      setRuntime(() => {}, runtime.context, undefined, 'Replay')
      const replayContext = requireRuntimeContext()
      clearRuntime()
      const replayRoot = Context.get(replayContext, CurrentInstance)!.node
      const replayRootContext = invocationContext(block.owner.id, replayContext)
      const replayChildContext = invocationContext(
        OptionalChildBinding.placement,
        replayContext,
        { binding: OptionalChildBinding },
        true,
      )
      const replayChild = Context.get(replayChildContext, CurrentInstance)!.node

      expect(replayRoot).not.toBe(liveRoot)
      expect(replayChild).not.toBe(liveChild)
      expect(replayRoot.mounts).not.toBe(liveRoot.mounts)
      expect(replayChild.mounts).not.toBe(liveChild.mounts)
      expect(replayRoot.isActive).toBe(false)
      expect(replayChild.isActive).toBe(false)

      const readReplayResource = <Value, Requirements>(
        effect: Effect.Effect<Value, ResourceNotAvailable, Requirements>,
      ) =>
        effect.pipe(
          Effect.as(true),
          Effect.catchTag('ResourceNotAvailable', () => Effect.succeed(false)),
        )
      await expect(
        Effect.runPromise(
          readReplayResource(RootValue.get).pipe(
            Effect.provide(replayRootContext),
          ),
        ),
      ).resolves.toBe(false)
      await expect(
        Effect.runPromise(
          readReplayResource(ChildValue.get).pipe(
            Effect.provide(replayChildContext),
          ),
        ),
      ).resolves.toBe(false)

      setRuntime(() => {}, runtime.context, undefined, 'Replay')
      const nextReplayContext = requireRuntimeContext()
      clearRuntime()
      const nextReplayRoot = Context.get(
        nextReplayContext,
        CurrentInstance,
      )!.node
      expect(nextReplayRoot).not.toBe(replayRoot)
      expect(nextReplayRoot.children.size).toBe(0)
    })
  })

  it('captures lifecycle provenance and rejects a removed occurrence after replacement', async () => {
    await withRuntime(async (runtime, { messages }) => {
      const rootNode = Context.get(runtime.context, CurrentInstance)!.node
      const oldChild = rootNode.children
        .get(OptionalChildBinding)!
        .get(undefined)!

      await vi.waitFor(() =>
        expect(messages).toContainEqual({
          _tag: 'GotLifecycleChildMessage',
          placement: OptionalChildBinding.placement,
          generation: oldChild.generation,
          message: ChildMessage.EmittedPulse(),
        }),
      )

      const toRootMessage = Reflect.get(oldChild, 'toRootMessage')
      const oldMessage = Reflect.apply(toRootMessage, oldChild, [
        ChildMessage.EmittedPulse(),
      ])
      const oldGuard = runtime.externalMessageGuard(oldMessage)
      expect(oldGuard?.()).toBe(true)

      runtime.synchronize(
        modifyFields(initialModel, { maybeChild: () => Option.none() }),
      )
      expect(oldGuard?.()).toBe(false)
      expect(runtime.externalMessageGuard(oldMessage)).toBeUndefined()

      runtime.synchronize(initialModel)
      const replacement = rootNode.children
        .get(OptionalChildBinding)!
        .get(undefined)!
      expect(replacement.generation).not.toBe(oldChild.generation)
      expect(runtime.externalMessageGuard(oldMessage)).toBeUndefined()
    })
  })

  it('captures repeated and nested generated Command origins', async () => {
    await withNestedRuntime(
      async runtime => {
        const rootNode = Context.get(runtime.context, CurrentInstance)!.node
        const parentNode = rootNode.children.get(NestedParentsBinding)!.get(1)!
        const entryNode = parentNode.children
          .get(NestedEntriesBinding)!
          .get(10)!
        const syntheticMessage = {
          _tag: 'GotParentsMessage',
          placement: NestedParentsBinding.placement,
          generation: 0,
          key: 1,
          message: {
            _tag: 'GotEntriesMessage',
            placement: NestedEntriesBinding.placement,
            generation: 0,
            key: 10,
            message: ChildMessage.EmittedPulse(),
          },
        }
        const command = qualifyCommand(
          NestedParentsBinding.placement,
          qualifyCommand(
            NestedEntriesBinding.placement,
            { name: 'EmitPulse', effect: Effect.succeed(syntheticMessage) },
            undefined,
            { binding: NestedEntriesBinding, key: 10 },
          ),
          undefined,
          { binding: NestedParentsBinding, key: 1 },
        )
        const captured = runtime.capture(command)!
        const stamped = captured.mapResult!(syntheticMessage)

        expect(stamped).toEqual({
          ...syntheticMessage,
          generation: parentNode.generation,
          message: {
            ...syntheticMessage.message,
            generation: entryNode.generation,
          },
        })
        const acceptedGuard = runtime.externalMessageGuard(stamped)
        expect(acceptedGuard?.()).toBe(true)

        runtime.synchronize({ parents: [{ id: 1, entries: [] }] })
        expect(acceptedGuard?.()).toBe(false)
        expect(runtime.externalMessageGuard(stamped)).toBeUndefined()

        runtime.synchronize(nestedInitialModel)
        const replacementEntry = rootNode.children
          .get(NestedParentsBinding)!
          .get(1)!
          .children.get(NestedEntriesBinding)!
          .get(10)!
        expect(replacementEntry.generation).not.toBe(entryNode.generation)
        expect(runtime.externalMessageGuard(stamped)).toBeUndefined()
      },
      () => Effect.void,
    )
  })
})
