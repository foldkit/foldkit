import { Context, Effect, Layer, Option, Schema, Scope, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { runtimeBindingOf } from '../block/composition.js'
import { define } from '../block/define.js'
import { CurrentInstance } from '../block/instanceContext.js'
import { invocationContext, qualifyLayer } from '../block/scope.js'
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

const Child = define('LifecycleChild')
const ChildModel = Schema.Struct({ id: Schema.Number })
const ChildMessage = defineMessageUnion({ EmittedPulse: {} })
const ChildValue = Child.resource<string>()('Value')
class LifecycleLog extends Context.Service<
  LifecycleLog,
  Readonly<{
    started: (id: number) => void
    stopped: (id: number) => void
    acquiredResource: (value: string) => void
    releaseResource: (value: string) => Effect.Effect<void>
  }>
>()('CompositionRuntime/LifecycleLog') {}
const child = Child.define({ Model: ChildModel, Message: ChildMessage })
const subscriptions = child.subscriptions(entry => ({
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
const childManagedResources = child.managedResources(entry => ({
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
const childComposition = child.makeComposition()
const childBlock = childComposition.makeBlock({
  init: (id: number) => ({ model: { id } }),
  update: childComposition.makeUpdate(model => ({ model })),
  subscriptions,
  managedResources: childManagedResources,
  EffectsLayer: Layer.merge(
    subscriptions.pulses.layer,
    childManagedResources.value.layer,
  ),
})
const Root = define('LifecycleApp')
const RootValue = Root.resource<string>()('Value')
const RootModel = Schema.Struct({
  maybeChild: Schema.Option(ChildModel),
  entries: Schema.Array(ChildModel),
  subscriptionState: Schema.Literals(['Active', 'Paused']),
})
type RootModel = typeof RootModel.Type
const RootMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
const rootBase = Root.define({
  Model: RootModel,
  Message: RootMessage,
})
const OptionalChildBinding = rootBase.bindChild(childBlock, {
  fromParentMessage: false,
  read: (model: RootModel) => model.maybeChild,
  write: (model, nextChild) =>
    modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  parentMessage: RootMessage.GotChildMessage,
  subscriptions: { when: model => model.subscriptionState === 'Active' },
})
const EntriesBinding = rootBase.bindChild(childBlock, {
  fromParentMessage: false,
  placement: 'Entries',
  readAll: (model: RootModel) => model.entries,
  key: entry => entry.id,
  read: entry => entry,
  writeAt: (model, key: number, nextChild) =>
    modifyFields(model, {
      entries: entries =>
        entries.map(entry => (entry.id === key ? nextChild : entry)),
    }),
  toParentMessage: (_key, message) => RootMessage.GotChildMessage({ message }),
})
const root = rootBase.makeComposition({
  childBindings: [OptionalChildBinding, EntriesBinding],
})
const rootManagedResources = rootBase.managedResources(entry => ({
  value: entry('Value', Schema.Option(Schema.Null), {
    resource: RootValue,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () =>
      RootMessage.GotChildMessage({ message: ChildMessage.EmittedPulse() }),
    onReleased: () =>
      RootMessage.GotChildMessage({ message: ChildMessage.EmittedPulse() }),
    onAcquireError: () =>
      RootMessage.GotChildMessage({ message: ChildMessage.EmittedPulse() }),
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
const block = root.makeBlock({
  init: () => ({ model: initialModel }),
  update: root.makeUpdate(model => ({ model })),
  managedResources: rootManagedResources,
  EffectsLayer: rootManagedResources.value.layer,
})

const NestedParent = define('NestedLifecycleParent')
const NestedParentModel = Schema.Struct({
  id: Schema.Number,
  entries: Schema.Array(ChildModel),
})
type NestedParentModel = typeof NestedParentModel.Type
const NestedParentMessage = defineMessageUnion({
  GotChildMessage: { id: Schema.Number, message: ChildMessage },
})
const nestedParentBase = NestedParent.define({
  Model: NestedParentModel,
  Message: NestedParentMessage,
})
const NestedEntriesBinding = nestedParentBase.bindChild(childBlock, {
  fromParentMessage: false,
  placement: 'entries',
  readAll: (model: NestedParentModel) => model.entries,
  key: (entry): number => entry.id,
  read: entry => entry,
  writeAt: (model, key, nextChild) =>
    modifyFields(model, {
      entries: entries =>
        entries.map(entry => (entry.id === key ? nextChild : entry)),
    }),
  toParentMessage: (id: number, message) =>
    NestedParentMessage.GotChildMessage({ id, message }),
})
const nestedParent = nestedParentBase.makeComposition({
  childBindings: [NestedEntriesBinding],
})
const nestedParentBlock = nestedParent.makeBlock({
  init: (id: number, entries: ReadonlyArray<typeof ChildModel.Type>) => ({
    model: { id, entries },
  }),
  update: nestedParent.makeUpdate((model, message) =>
    NestedParentMessage.match(message, {
      GotChildMessage: ({ id, message }) =>
        NestedEntriesBinding.fold(model, id, message),
    }),
  ),
  EffectsLayer: Layer.empty,
})
const NestedRoot = define('NestedLifecycleApp')
const NestedRootModel = Schema.Struct({
  parents: Schema.Array(NestedParentModel),
})
type NestedRootModel = typeof NestedRootModel.Type
const NestedRootMessage = defineMessageUnion({
  GotParentMessage: { id: Schema.Number, message: NestedParentMessage },
})
const nestedRootBase = NestedRoot.define({
  Model: NestedRootModel,
  Message: NestedRootMessage,
})
const NestedParentsBinding = nestedRootBase.bindChild(nestedParentBlock, {
  fromParentMessage: false,
  placement: 'parents',
  readAll: (model: NestedRootModel) => model.parents,
  key: (parent): number => parent.id,
  read: parent => parent,
  writeAt: (model, key: number, nextParent) =>
    modifyFields(model, {
      parents: parents =>
        parents.map(parent => (parent.id === key ? nextParent : parent)),
    }),
  toParentMessage: (id: number, message) =>
    NestedRootMessage.GotParentMessage({ id, message }),
})
const nestedRoot = nestedRootBase.makeComposition({
  childBindings: [NestedParentsBinding],
})
const nestedInitialModel = NestedRootModel.make({
  parents: [{ id: 1, entries: [{ id: 10 }] }],
})
const nestedBlock = nestedRoot.makeBlock({
  init: () => ({ model: nestedInitialModel }),
  update: nestedRoot.makeUpdate((model, message) =>
    NestedRootMessage.match(message, {
      GotParentMessage: ({ id, message }) =>
        NestedParentsBinding.fold(model, id, message),
    }),
  ),
  EffectsLayer: Layer.empty,
})

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
          enqueueMessage: () => {},
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
          typeof NestedRootMessage.Type
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
          typeof NestedRootMessage.Type
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
        ).toThrow(/duplicate key|string or finite number keys/)
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
})
