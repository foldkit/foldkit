import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  ROOT_BOUNDARY,
  beginRender,
  boundaryMappers,
  composeBoundary,
  createBoundaryRegistry,
  deregisterBoundaryWrap,
  getOrCreateBoundaryDispatch,
  registerBoundaryWrap,
  resolveBoundaryDispatchThunk,
  resolveMountBoundaryDispatch,
} from './boundary.js'
import type { DispatchSync } from './runtimeSingleton.js'

describe('boundary chain traversal', () => {
  it('applies every ancestor from inner to outer for each routing mode', () => {
    const registry = createBoundaryRegistry()
    const calls: Array<unknown> = []
    const dispatch: DispatchSync = message => calls.push(message)
    const childMessage = { _tag: 'CompletedChildMount' }
    const expectedMessage = {
      _tag: 'GotParent',
      message: {
        _tag: 'GotChild',
        message: childMessage,
      },
    }

    registerBoundaryWrap(
      registry,
      'parent',
      {
        toParentMessage: message => ({ _tag: 'GotParent', message }),
      },
      dispatch,
    )
    registerBoundaryWrap(
      registry,
      'parent|child',
      {
        toParentMessage: message => ({ _tag: 'GotChild', message }),
      },
      dispatch,
    )

    getOrCreateBoundaryDispatch(
      registry,
      dispatch,
      'parent|child',
    )(childMessage)
    resolveBoundaryDispatchThunk(
      registry,
      dispatch,
      'parent|child',
      childMessage,
    )()
    resolveMountBoundaryDispatch(
      registry,
      dispatch,
      'parent|child',
    )(childMessage)
    const sceneMessage = boundaryMappers(
      registry,
      'parent|child',
    ).reduce<unknown>(
      (message, toParentMessage) => toParentMessage(message),
      childMessage,
    )

    expect(calls).toEqual([expectedMessage, expectedMessage, expectedMessage])
    expect(sceneMessage).toEqual(expectedMessage)
  })
})

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

  it('names the boundary, the Message, and the likely cause when toParentMessage rejects', () => {
    // A wrapper Message is normally a Schema constructor, so a Message
    // outside the child's union throws a Schema error naming only the two
    // shapes. On its own that is undiagnosable from inside a DOM listener,
    // so the boundary reframes it.
    const registry = createBoundaryRegistry()
    registry.wraps.set('ui-Button', {
      toParentMessage: message => {
        if (Reflect.get(Object(message), '_tag') !== 'ClickedButtonDemo') {
          throw new Error('Expected { readonly "_tag": "ClickedButtonDemo" }')
        }
        return { _tag: 'GotUiPageMessage', message }
      },
    })

    const dispatcher = getOrCreateBoundaryDispatch(
      registry,
      () => {},
      'ui-Button',
    )

    expect(() => dispatcher({ _tag: 'ClickedCopySnippet' })).toThrow(
      /boundary "ui-Button".*`ClickedCopySnippet`.*shared view helper/s,
    )
  })

  it('describes a Message whose _tag throws without masking the rejection', () => {
    const registry = createBoundaryRegistry()
    const original = new Error('schema said no')
    registry.wraps.set('child', {
      toParentMessage: () => {
        throw original
      },
    })

    const hostile = new Proxy(
      { _tag: 'Foreign' },
      {
        get: () => {
          throw new Error('proxy trap')
        },
      },
    )

    const dispatcher = getOrCreateBoundaryDispatch(registry, () => {}, 'child')

    expect(() => dispatcher(hostile)).toThrow(/could not be lifted/)
    expect(() => dispatcher(hostile)).toThrow(
      expect.objectContaining({ cause: original }),
    )
  })

  it('keeps the original rejection as the cause', () => {
    const registry = createBoundaryRegistry()
    const original = new Error('schema said no')
    registry.wraps.set('child', {
      toParentMessage: () => {
        throw original
      },
    })

    const dispatcher = getOrCreateBoundaryDispatch(registry, () => {}, 'child')

    expect(() => dispatcher({ _tag: 'Foreign' })).toThrow(
      expect.objectContaining({ cause: original }),
    )
  })
})

describe('resolveBoundaryDispatchThunk', () => {
  it('reframes an OnUnmount rejection the same way live dispatch does', () => {
    // OnUnmount resolves its lift eagerly, so a rejection surfaces here rather
    // than through dispatchAcrossBoundary and needs the same framing.
    const registry = createBoundaryRegistry()
    const original = new Error('schema said no')
    registry.wraps.set('ui-Button', {
      toParentMessage: () => {
        throw original
      },
    })

    expect(() =>
      resolveBoundaryDispatchThunk(registry, () => {}, 'ui-Button', {
        _tag: 'ClickedCopySnippet',
      }),
    ).toThrow(/boundary "ui-Button".*`ClickedCopySnippet`/s)

    expect(() =>
      resolveBoundaryDispatchThunk(registry, () => {}, 'ui-Button', {
        _tag: 'ClickedCopySnippet',
      }),
    ).toThrow(expect.objectContaining({ cause: original }))
  })
})

describe('resolveMountBoundaryDispatch', () => {
  it('follows current wrappers from its render owner without crossing into replay wrappers', () => {
    const registry = createBoundaryRegistry()
    const liveCalls: Array<unknown> = []
    const replayCalls: Array<unknown> = []
    const liveDispatch: DispatchSync = message => liveCalls.push(message)
    const replayDispatch: DispatchSync = message => replayCalls.push(message)

    registerBoundaryWrap(
      registry,
      'child',
      {
        toParentMessage: message => ({ ownerId: 0, message }),
      },
      liveDispatch,
    )
    const mountDispatch = resolveMountBoundaryDispatch(
      registry,
      liveDispatch,
      'child',
    )

    mountDispatch({ _tag: 'CompletedChildMount' })

    beginRender(registry)
    registerBoundaryWrap(
      registry,
      'child',
      {
        toParentMessage: message => ({ ownerId: 1, message }),
      },
      liveDispatch,
    )
    mountDispatch({ _tag: 'CompletedChildMount' })

    beginRender(registry)
    registerBoundaryWrap(
      registry,
      'child',
      {
        toParentMessage: message => ({ ownerId: 99, message }),
      },
      replayDispatch,
    )
    mountDispatch({ _tag: 'CompletedChildMount' })

    expect(liveCalls).toEqual([
      { ownerId: 0, message: { _tag: 'CompletedChildMount' } },
      { ownerId: 1, message: { _tag: 'CompletedChildMount' } },
      { ownerId: 1, message: { _tag: 'CompletedChildMount' } },
    ])
    expect(replayCalls).toEqual([])
  })

  it('reframes a rejected Mount result with the Submodel diagnostic', () => {
    const registry = createBoundaryRegistry()
    const original = new Error('schema said no')
    const dispatch: DispatchSync = () => {}
    registerBoundaryWrap(
      registry,
      'ui-Button',
      {
        toParentMessage: () => {
          throw original
        },
      },
      dispatch,
    )
    const mountDispatch = resolveMountBoundaryDispatch(
      registry,
      dispatch,
      'ui-Button',
    )

    expect(() => mountDispatch({ _tag: 'ClickedCopySnippet' })).toThrow(
      /boundary "ui-Button".*`ClickedCopySnippet`/s,
    )
    expect(() => mountDispatch({ _tag: 'ClickedCopySnippet' })).toThrow(
      expect.objectContaining({ cause: original }),
    )
  })

  it('cleans wrappers from every render owner after in-place patches', () => {
    const assertOwnersCleaned = (finalOwner: 'Live' | 'Replay'): void => {
      const registry = createBoundaryRegistry()
      const liveDispatch: DispatchSync = () => {}
      const replayDispatch: DispatchSync = () => {}
      const initialLiveDescriptor = {
        toParentMessage: (message: unknown) => ({ ownerId: 0, message }),
      }
      const replayDescriptor = {
        toParentMessage: (message: unknown) => ({ ownerId: 99, message }),
      }
      const resumedLiveDescriptor = {
        toParentMessage: (message: unknown) => ({ ownerId: 1, message }),
      }

      registerBoundaryWrap(
        registry,
        'child',
        initialLiveDescriptor,
        liveDispatch,
      )
      beginRender(registry)
      registerBoundaryWrap(registry, 'child', replayDescriptor, replayDispatch)

      if (finalOwner === 'Live') {
        beginRender(registry)
        registerBoundaryWrap(
          registry,
          'child',
          resumedLiveDescriptor,
          liveDispatch,
        )
        deregisterBoundaryWrap(
          registry,
          'child',
          resumedLiveDescriptor,
          liveDispatch,
        )
      } else {
        deregisterBoundaryWrap(
          registry,
          'child',
          replayDescriptor,
          replayDispatch,
        )
      }

      expect(registry.wraps.size).toBe(0)
      expect(registry.mountWraps.get(liveDispatch)?.size).toBe(0)
      expect(registry.mountWraps.get(replayDispatch)?.size).toBe(0)
      expect(registry.mountWrapOwners.size).toBe(0)
    }

    assertOwnersCleaned('Live')
    assertOwnersCleaned('Replay')
  })
})
