import { Array, Context, Effect, Option, Ref, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as Interruptible from '../command/interruptible/index.js'
import { createBoundaryRegistry } from '../html/boundary.js'
import { __htmlBuilder } from '../html/index.js'
import {
  clearRuntime,
  getCurrentFrame,
  setRuntime,
} from '../html/runtimeSingleton.js'
import { makeDefinition } from './define.js'
import { type ActiveInstance, CurrentInstance } from './instanceContext.js'
import { scopeView } from './viewScope.js'

const Resource = Context.Reference<Ref.Ref<number>>('ViewScope/Resource', {
  defaultValue: () => Ref.makeUnsafe(0),
})

const Model = Schema.Struct({ value: Schema.Number })
type Model = typeof Model.Type
const ViewScope = makeDefinition('ViewScope', {
  Model,
  Message: Schema.Never,
})
const composition = ViewScope.makeComposition()

const makeView = (render: (model: Model) => void) =>
  scopeView(
    'ViewScope',
    composition.makeView(model => {
      render(model)
      return null
    }),
  )

const render = (view: ReturnType<typeof makeView>, value: number): void => {
  view(Model.make({ value }), __htmlBuilder())
}

const makeInstance = (
  generation: number,
  resources: Context.Context<never> = Context.empty(),
): ActiveInstance => ({
  isActive: true,
  generation,
  resources,
  mounts: new Set(),
  children: new Map(),
})

const clearFrames = (): void => {
  for (;;) {
    try {
      getCurrentFrame()
      clearRuntime()
    } catch {
      return
    }
  }
}

describe('view Context reuse', () => {
  afterEach(clearFrames)

  it('retains new Models, render frames, and changing Ref values', () => {
    const value = Ref.makeUnsafe(1)
    const resources = Context.makeUnsafe<never>(
      new Map([[Resource.key, value]]),
    )
    const node = makeInstance(1, resources)
    const context = Context.add(Context.empty(), CurrentInstance, { node })
    const seenContexts: Array<Context.Context<never>> = []
    const seenDispatches: Array<(message: unknown) => void> = []
    const seenModels: Array<number> = []
    const seenValues: Array<number> = []
    const view = makeView(model => {
      const frame = getCurrentFrame()
      const scoped = frame.runtimeContext
      seenContexts.push(scoped)
      seenDispatches.push(frame.outerDispatch)
      seenModels.push(model.value)
      seenValues.push(Effect.runSync(Ref.get(Context.get(scoped, Resource))))
    })
    const registry = createBoundaryRegistry()
    const firstDispatch = vi.fn()
    const secondDispatch = vi.fn()

    setRuntime(firstDispatch, context, registry)
    render(view, 1)
    clearRuntime()

    Effect.runSync(Ref.set(value, 2))
    setRuntime(secondDispatch, context, registry)
    render(view, 2)
    clearRuntime()

    const firstContext = Option.getOrThrow(Array.get(seenContexts, 0))
    const secondContext = Option.getOrThrow(Array.get(seenContexts, 1))
    expect(secondContext).toBe(firstContext)
    expect(seenDispatches).toEqual([firstDispatch, secondDispatch])
    expect(seenModels).toEqual([1, 2])
    expect(seenValues).toEqual([1, 2])
  })

  it('invalidates when one live node generation changes', () => {
    const lookup = vi.fn(() => [])
    const registry: Interruptible.__Registry = {
      lookup,
      register: () => {},
      release: () => {},
      interrupt: () => Effect.succeed(Interruptible.Outcome.NotFound()),
    }
    const node = makeInstance(1)
    const context = Context.add(
      Context.add(Context.empty(), CurrentInstance, { node }),
      Interruptible.__CurrentRegistry,
      registry,
    )
    const seenContexts: Array<Context.Context<never>> = []
    const view = makeView(() => {
      const scoped = getCurrentFrame().runtimeContext
      seenContexts.push(scoped)
      Context.get(scoped, Interruptible.__CurrentRegistry).lookup('task')
    })
    const boundaryRegistry = createBoundaryRegistry()

    setRuntime(vi.fn(), context, boundaryRegistry)
    render(view, 1)
    clearRuntime()

    node.generation = 2
    setRuntime(vi.fn(), context, boundaryRegistry)
    render(view, 2)
    clearRuntime()

    const firstContext = Option.getOrThrow(Array.get(seenContexts, 0))
    const secondContext = Option.getOrThrow(Array.get(seenContexts, 1))
    expect(secondContext).not.toBe(firstContext)
    expect(lookup).toHaveBeenNthCalledWith(1, 'ViewScope[]#1/task')
    expect(lookup).toHaveBeenNthCalledWith(2, 'ViewScope[]#2/task')
  })

  it('invalidates when one live node replaces its resource Context', () => {
    const firstValue = Ref.makeUnsafe(1)
    const firstResources = Context.makeUnsafe<never>(
      new Map([[Resource.key, firstValue]]),
    )
    const node = makeInstance(1, firstResources)
    const context = Context.add(Context.empty(), CurrentInstance, { node })
    const seenContexts: Array<Context.Context<never>> = []
    const seenValues: Array<number> = []
    const view = makeView(() => {
      const scoped = getCurrentFrame().runtimeContext
      seenContexts.push(scoped)
      seenValues.push(Effect.runSync(Ref.get(Context.get(scoped, Resource))))
    })
    const boundaryRegistry = createBoundaryRegistry()

    setRuntime(vi.fn(), context, boundaryRegistry)
    render(view, 1)
    clearRuntime()

    const secondValue = Ref.makeUnsafe(2)
    node.resources = Context.makeUnsafe<never>(
      new Map([[Resource.key, secondValue]]),
    )
    setRuntime(vi.fn(), context, boundaryRegistry)
    render(view, 2)
    clearRuntime()

    const firstContext = Option.getOrThrow(Array.get(seenContexts, 0))
    const secondContext = Option.getOrThrow(Array.get(seenContexts, 1))
    expect(secondContext).not.toBe(firstContext)
    expect(seenValues).toEqual([1, 2])
  })

  it('keeps different live runtime Contexts isolated', () => {
    const first = Context.add(Context.empty(), CurrentInstance, {
      node: makeInstance(1),
    })
    const second = Context.add(Context.empty(), CurrentInstance, {
      node: makeInstance(2),
    })
    const seen: Array<Context.Context<never>> = []
    const view = makeView(() => {
      seen.push(getCurrentFrame().runtimeContext)
    })
    const registry = createBoundaryRegistry()

    setRuntime(vi.fn(), first, registry)
    render(view, 1)
    clearRuntime()
    setRuntime(vi.fn(), second, registry)
    render(view, 2)
    clearRuntime()

    const firstContext = Option.getOrThrow(Array.get(seen, 0))
    const secondContext = Option.getOrThrow(Array.get(seen, 1))
    expect(secondContext).not.toBe(firstContext)
    expect(Context.get(firstContext, CurrentInstance)?.node.generation).toBe(1)
    expect(Context.get(secondContext, CurrentInstance)?.node.generation).toBe(2)
  })

  it('does not reuse historical Contexts created by Replay', () => {
    let historicalGeneration = 10
    const live = makeInstance(1)
    const context = Context.add(Context.empty(), CurrentInstance, {
      node: live,
      historicalRoot: () => makeInstance(historicalGeneration++),
    })
    const seenContexts: Array<Context.Context<never>> = []
    const seenNodes: Array<ActiveInstance> = []
    const view = makeView(() => {
      const scoped = getCurrentFrame().runtimeContext
      seenContexts.push(scoped)
      const cursor = Context.get(scoped, CurrentInstance)
      if (cursor !== undefined) {
        seenNodes.push(cursor.node)
      }
    })
    const registry = createBoundaryRegistry()

    setRuntime(vi.fn(), context, registry, 'Replay')
    render(view, 1)
    clearRuntime()
    setRuntime(vi.fn(), context, registry, 'Replay')
    render(view, 2)
    clearRuntime()

    const firstContext = Option.getOrThrow(Array.get(seenContexts, 0))
    const secondContext = Option.getOrThrow(Array.get(seenContexts, 1))
    const generations = Array.map(seenNodes, node => node.generation)
    expect(secondContext).not.toBe(firstContext)
    expect(Option.getOrThrow(Array.get(seenNodes, 1))).not.toBe(
      Option.getOrThrow(Array.get(seenNodes, 0)),
    )
    expect(generations).toEqual([10, 11])
  })
})
