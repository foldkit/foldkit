import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import {
  ROOT_BOUNDARY,
  composeBoundary,
  createBoundaryRegistry,
  getOrCreateBoundaryDispatch,
} from './boundary.js'
import type { DispatchSync } from './runtimeSingleton.js'

describe('composeBoundary', () => {
  it('appends a child slotId under the root boundary', () => {
    expect(composeBoundary(ROOT_BOUNDARY, 'child')).toBe('child')
  })

  it('joins parent and child with the boundary separator', () => {
    expect(composeBoundary('parent', 'child')).toBe('parent|child')
  })

  it('throws when the child slotId contains the boundary separator', () => {
    // NOTE: without this check, a slotId like "row|inner" composed under
    // a parent "list" would produce the same boundary id
    // "list|row|inner" as a real two-level nesting through
    // "list" → "row" → "inner", and the wraps registered for those
    // distinct boundaries would clobber each other.
    expect(() => composeBoundary('list', 'row|inner')).toThrow(
      /h\.submodel slotId cannot contain the boundary separator/,
    )
  })

  it('throws when a slotId contains the separator even under the root boundary', () => {
    expect(() => composeBoundary(ROOT_BOUNDARY, 'foo|bar')).toThrow(
      /h\.submodel slotId cannot contain the boundary separator/,
    )
  })
})

describe('getOrCreateBoundaryDispatch', () => {
  it('returns a per-outerDispatch dispatcher so DevTools jump-to renders do not leak into the live app', () => {
    // NOTE: the cache is keyed by (outerDispatch, boundaryId) so each
    // outerDispatch gets its own per-boundary dispatchers. Keying by
    // boundaryId alone would let a dispatcher created during a live
    // render close over the live outerDispatch after a jump-to render
    // installed `noOpDispatch`, silently mutating the live app.
    const registry = createBoundaryRegistry()
    registry.wraps.set('child', {
      toParentMessage: message => ({ _tag: 'GotChild', inner: message }),
    })

    const liveCalls: Array<unknown> = []
    const noOpCalls: Array<unknown> = []
    const liveDispatch: DispatchSync = message => liveCalls.push(message)
    const noOpDispatch: DispatchSync = message => noOpCalls.push(message)

    const liveDispatcher = getOrCreateBoundaryDispatch(
      registry,
      liveDispatch,
      'child',
    )
    liveDispatcher({ _tag: 'Click' })
    expect(liveCalls).toEqual([{ _tag: 'GotChild', inner: { _tag: 'Click' } }])
    expect(noOpCalls).toEqual([])

    // Simulate DevTools jump-to. getOrCreateBoundaryDispatch for the
    // same boundaryId must return a different dispatcher closed over
    // noOpDispatch, not the cached live-bound one.
    const noOpDispatcher = getOrCreateBoundaryDispatch(
      registry,
      noOpDispatch,
      'child',
    )
    expect(noOpDispatcher).not.toBe(liveDispatcher)

    noOpDispatcher({ _tag: 'Click' })
    expect(liveCalls).toEqual([{ _tag: 'GotChild', inner: { _tag: 'Click' } }])
    expect(noOpCalls).toEqual([{ _tag: 'GotChild', inner: { _tag: 'Click' } }])
  })

  it('returns the same dispatcher for repeated calls with the same outerDispatch (cache hit)', () => {
    // The cache benefit: stable references across repeated calls within
    // the same render so lazy.ts's dispatch-identity check hits and
    // memoized child views are reused.
    const registry = createBoundaryRegistry()
    const dispatch: DispatchSync = () => {}
    const a = getOrCreateBoundaryDispatch(registry, dispatch, 'child')
    const b = getOrCreateBoundaryDispatch(registry, dispatch, 'child')
    expect(a).toBe(b)
  })

  it('returns outerDispatch directly for the root boundary', () => {
    const registry = createBoundaryRegistry()
    const dispatch: DispatchSync = () => {}
    expect(getOrCreateBoundaryDispatch(registry, dispatch, ROOT_BOUNDARY)).toBe(
      dispatch,
    )
  })
})
