import { Context } from 'effect'
import { afterEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  type ActiveInstance,
  CurrentInstance,
} from '../block/instanceContext.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import {
  beginBoundaryWrapTransaction,
  beginRender,
  createBoundaryRegistry,
  deregisterBoundaryWrap,
  registerBoundaryWrap,
  restoreBoundaryWrapsForLazyHit,
  rollbackBoundaryWrapTransaction,
} from './boundary.js'
import {
  type DispatchSync,
  clearRuntime,
  getCurrentFrame,
  pushBoundary,
  pushFrame,
  requireDispatch,
  setRuntime,
} from './runtimeSingleton.js'

const makeContext = (dispatchSync: DispatchSync) =>
  Context.make(
    Dispatch,
    Dispatch.of({
      dispatchAsync: () =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Promise.resolve() as unknown as ReturnType<
          typeof Dispatch.Service.dispatchAsync
        >,
      dispatchSync,
    }),
  ).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

const drainStack = (): void => {
  for (;;) {
    try {
      requireDispatch()
    } catch {
      return
    }
    clearRuntime()
  }
}

describe('runtimeSingleton', () => {
  afterEach(() => {
    drainStack()
  })

  it('throws when no frame is active', () => {
    expect(() => requireDispatch()).toThrow(/inside a runtime-driven render/)
  })

  it('returns the current frame after setRuntime', () => {
    const dispatch: DispatchSync = () => {}
    setRuntime(dispatch, makeContext(dispatch))
    expect(requireDispatch()).toBe(dispatch)
  })

  it('restores the previous frame after clearRuntime', () => {
    const outerDispatch: DispatchSync = () => {}
    const innerDispatch: DispatchSync = () => {}
    setRuntime(outerDispatch, makeContext(outerDispatch))
    setRuntime(innerDispatch, makeContext(innerDispatch))
    expect(requireDispatch()).toBe(innerDispatch)
    clearRuntime()
    expect(requireDispatch()).toBe(outerDispatch)
    clearRuntime()
    expect(() => requireDispatch()).toThrow()
  })

  it('keeps the singleton clean after a try/finally clears on throw', () => {
    const dispatch: DispatchSync = () => {}
    expect(() => {
      setRuntime(dispatch, makeContext(dispatch))
      try {
        throw new Error('view exploded')
      } finally {
        clearRuntime()
      }
    }).toThrow('view exploded')
    expect(() => requireDispatch()).toThrow(/runtime-driven render/)
  })

  it('refreshes a captured Frame after its boundary is removed and remounted', () => {
    const registry = createBoundaryRegistry()
    const dispatched: Array<unknown> = []
    const outerDispatch: DispatchSync = message => dispatched.push(message)
    const firstBlock = {
      toParentMessage: (message: unknown) => ({ generation: 1, message }),
    }

    setRuntime(outerDispatch, makeContext(outerDispatch), registry)
    registerBoundaryWrap(registry, 'child', firstBlock, outerDispatch)
    pushBoundary('child')
    const capturedFrame = getCurrentFrame()
    const oldDispatch = requireDispatch()
    clearRuntime()

    deregisterBoundaryWrap(registry, 'child', firstBlock, outerDispatch)
    beginRender(registry)
    const replacementBlock = {
      toParentMessage: (message: unknown) => ({ generation: 2, message }),
    }
    registerBoundaryWrap(registry, 'child', replacementBlock, outerDispatch)

    pushFrame(capturedFrame)
    const remountedDispatch = requireDispatch()
    clearRuntime()

    expect(remountedDispatch).not.toBe(oldDispatch)
    oldDispatch({ _tag: 'FromOldBoundary' })
    remountedDispatch({ _tag: 'FromRemountedBoundary' })
    expect(dispatched).toEqual([
      {
        generation: 2,
        message: { _tag: 'FromRemountedBoundary' },
      },
    ])
  })

  it('keeps a cached captured Frame dispatcher guarded by its occurrence', () => {
    const dispatched: Array<unknown> = []
    const outerDispatch: DispatchSync = message => dispatched.push(message)
    const occurrence: ActiveInstance = {
      isActive: true,
      generation: 1,
      resources: Context.empty(),
      mounts: new Set(),
      children: new Map(),
    }
    const context = Context.add(makeContext(outerDispatch), CurrentInstance, {
      node: occurrence,
    })

    setRuntime(outerDispatch, context)
    const capturedFrame = getCurrentFrame()
    const firstDispatch = requireDispatch()
    clearRuntime()

    pushFrame(capturedFrame)
    const cachedDispatch = requireDispatch()
    clearRuntime()
    expect(cachedDispatch).toBe(firstDispatch)

    cachedDispatch({ _tag: 'WhileCurrent' })
    occurrence.isActive = false
    cachedDispatch({ _tag: 'AfterReplacement' })
    expect(dispatched).toEqual([{ _tag: 'WhileCurrent' }])
  })

  it('keeps alternating captured live and replay Frames isolated', () => {
    const registry = createBoundaryRegistry()
    const liveMessages: Array<unknown> = []
    const replayMessages: Array<unknown> = []
    const liveDispatch: DispatchSync = message => liveMessages.push(message)
    const replayDispatch: DispatchSync = message => replayMessages.push(message)
    const block = {
      toParentMessage: (message: unknown) => ({ _tag: 'GotChild', message }),
    }

    setRuntime(liveDispatch, makeContext(liveDispatch), registry)
    registerBoundaryWrap(registry, 'child', block, liveDispatch)
    pushBoundary('child')
    const liveFrame = getCurrentFrame()
    const firstLiveDispatch = requireDispatch()
    clearRuntime()

    setRuntime(replayDispatch, makeContext(replayDispatch), registry, 'Replay')
    pushBoundary('child')
    const replayFrame = getCurrentFrame()
    const firstReplayDispatch = requireDispatch()
    clearRuntime()
    clearRuntime()

    pushFrame(liveFrame)
    const secondLiveDispatch = requireDispatch()
    clearRuntime()
    pushFrame(replayFrame)
    const secondReplayDispatch = requireDispatch()
    clearRuntime()
    pushFrame(liveFrame)
    const thirdLiveDispatch = requireDispatch()
    clearRuntime()

    expect(secondLiveDispatch).toBe(firstLiveDispatch)
    expect(secondReplayDispatch).toBe(firstReplayDispatch)
    expect(firstReplayDispatch).not.toBe(firstLiveDispatch)
    expect(thirdLiveDispatch).toBe(firstLiveDispatch)

    secondLiveDispatch({ _tag: 'FromLive' })
    secondReplayDispatch({ _tag: 'FromReplay' })
    expect(liveMessages).toEqual([
      { _tag: 'GotChild', message: { _tag: 'FromLive' } },
    ])
    expect(replayMessages).toEqual([
      { _tag: 'GotChild', message: { _tag: 'FromReplay' } },
    ])
  })

  it('refreshes a captured Frame across transactional dispatcher restoration', () => {
    const registry = createBoundaryRegistry()
    const outerMessages: Array<unknown> = []
    const replacementMessages: Array<unknown> = []
    const outerDispatch: DispatchSync = message => outerMessages.push(message)
    const replacementDispatch: DispatchSync = message =>
      replacementMessages.push(message)
    const block = {
      toParentMessage: (message: unknown) => ({ _tag: 'GotChild', message }),
    }

    setRuntime(outerDispatch, makeContext(outerDispatch), registry)
    registerBoundaryWrap(registry, 'child', block, outerDispatch)
    pushBoundary('child')
    const capturedFrame = getCurrentFrame()
    const originalDispatch = requireDispatch()
    clearRuntime()

    beginRender(registry)
    const transaction = beginBoundaryWrapTransaction(registry)
    restoreBoundaryWrapsForLazyHit(
      registry,
      new Map([
        [
          'child',
          {
            callSite: 'runtimeSingleton cache transaction test',
            block,
            mountOuterDispatch: outerDispatch,
            eventOuterDispatch: outerDispatch,
            eventDispatch: replacementDispatch,
          },
        ],
      ]),
    )

    pushFrame(capturedFrame)
    const transactionDispatch = requireDispatch()
    clearRuntime()
    expect(transactionDispatch).toBe(replacementDispatch)
    transactionDispatch({ _tag: 'DuringTransaction' })
    expect(replacementMessages).toEqual([{ _tag: 'DuringTransaction' }])

    rollbackBoundaryWrapTransaction(registry, transaction)
    pushFrame(capturedFrame)
    const restoredDispatch = requireDispatch()
    clearRuntime()

    expect(restoredDispatch).toBe(originalDispatch)
    restoredDispatch({ _tag: 'AfterRollback' })
    expect(outerMessages).toEqual([
      { _tag: 'GotChild', message: { _tag: 'AfterRollback' } },
    ])
  })
})
