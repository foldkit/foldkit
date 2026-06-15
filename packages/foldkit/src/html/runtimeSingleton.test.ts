import { Context } from 'effect'
import { afterEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import {
  type DispatchSync,
  clearRuntime,
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

  it('shares the dispatch stack across module instances via globalThis', () => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const globalRecord = globalThis as Record<symbol, Array<unknown>>
    const stack = globalRecord[Symbol.for('foldkit/html/runtimeStack')]
    expect(Array.isArray(stack)).toBe(true)

    const dispatch: DispatchSync = () => {}
    setRuntime(dispatch, makeContext(dispatch))
    expect(stack.length).toBe(1)
    clearRuntime()
    expect(stack.length).toBe(0)
  })
})
