import { describe, it } from '@effect/vitest'
import { Context } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import {
  type DispatchSync,
  clearRuntime,
  pushScope,
  requireDispatch,
  setRuntime,
} from './runtimeSingleton.js'
import {
  type ScopeRegistry,
  beginRender,
  createScopeRegistry,
  pruneUnseenScopes,
} from './scope.js'
import { submodel } from './submodel.js'

const setUpRuntime = (
  registry: ScopeRegistry,
  dispatched: Array<unknown>,
): void => {
  const dispatchSync: DispatchSync = message => {
    dispatched.push(message)
  }
  const dispatchService = Dispatch.of({
    dispatchAsync: () =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Promise.resolve() as unknown as ReturnType<
        typeof Dispatch.Service.dispatchAsync
      >,
    dispatchSync,
  })
  const context = Context.make(Dispatch, dispatchService).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )
  setRuntime(dispatchSync, context, registry)
}

type ChildMessage = Readonly<{ _tag: 'ChildClicked'; value: number }>
type ParentMessage = Readonly<{
  _tag: 'GotChild'
  entryId: string
  message: ChildMessage
}>

const GotChild = (args: { entryId: string; message: ChildMessage }) =>
  ({ _tag: 'GotChild', ...args }) satisfies ParentMessage

// Mirrors how `h.OnClick` captures dispatch in the html factory: at
// VNode-construction time, while the current scope is still the
// Submodel's scope. Calling `requireDispatch()` inside the click handler
// would resolve at fire time when the scope has already been popped.
const childView = (model: { value: number }) => {
  const dispatch = requireDispatch()
  return h('button', {
    on: {
      click: () =>
        dispatch({
          _tag: 'ChildClicked',
          value: model.value,
        } satisfies ChildMessage),
    },
  })
}

describe('h.submodel', () => {
  let registry: ScopeRegistry
  let dispatched: Array<unknown>

  beforeEach(() => {
    registry = createScopeRegistry()
    dispatched = []
    setUpRuntime(registry, dispatched)
    beginRender(registry)
  })

  afterEach(() => {
    pruneUnseenScopes(registry)
    clearRuntime()
  })

  it('renders the child view and returns the VNode', () => {
    const result = submodel({
      id: 'child-1',
      view: childView,
      model: { value: 42 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'child-1' },
    })

    expect(result).not.toBeNull()
    expect(result?.sel).toBe('button')
  })

  it('wraps child messages dispatched inside the Submodel', () => {
    const result = submodel({
      id: 'child-1',
      view: childView,
      model: { value: 7 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'child-1' },
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        entryId: 'child-1',
        message: { _tag: 'ChildClicked', value: 7 },
      },
    ])
  })

  it('composes wrapping across nested Submodel boundaries', () => {
    type GrandparentMessage = Readonly<{
      _tag: 'GotParent'
      message: ParentMessage
    }>
    const GotParent = (args: {
      message: ParentMessage
    }): GrandparentMessage => ({ _tag: 'GotParent', ...args })

    const innerResult = submodel({
      id: 'parent',
      view: () =>
        submodel({
          id: 'child-1',
          view: childView,
          model: { value: 99 },
          wrapWith: GotChild,
          wrapArgs: { entryId: 'child-1' },
        }),
      model: {},
      wrapWith: GotParent,
      wrapArgs: {},
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = innerResult?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      {
        _tag: 'GotParent',
        message: {
          _tag: 'GotChild',
          entryId: 'child-1',
          message: { _tag: 'ChildClicked', value: 99 },
        },
      },
    ])
  })

  it('passes inputs as the second view argument when provided', () => {
    const viewWithInputs = (
      model: { value: number },
      inputs: { label: string },
    ) => h('div', `${inputs.label}: ${model.value}`)

    const result = submodel({
      id: 'with-inputs',
      view: viewWithInputs,
      model: { value: 3 },
      inputs: { label: 'count' },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'with-inputs' },
    })

    expect(result?.text).toBe('count: 3')
  })

  it('preserves outer scope after the Submodel call returns', () => {
    pushScope('outer')
    try {
      submodel({
        id: 'inner',
        view: () => h('span'),
        model: {},
        wrapWith: GotChild,
        wrapArgs: { entryId: 'inner' },
      })

      const dispatchSyncAfter = requireDispatch()
      dispatchSyncAfter({ _tag: 'AfterReturn' })

      // The dispatch returned after `submodel` should still be the outer
      // scope's dispatch, not the child's. The outer scope has no wrap
      // registered, so the message reaches the root dispatch unwrapped.
      // We've actually wrapped at 'outer' via no registration — let's
      // verify by checking the post-submodel message survives without
      // being wrapped with GotChild.
      expect(dispatched).toEqual([{ _tag: 'AfterReturn' }])
    } finally {
      clearRuntime()
    }
  })

  it('prunes wraps for Submodels that did not render this pass', () => {
    submodel({
      id: 'will-be-removed',
      view: childView,
      model: { value: 1 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'will-be-removed' },
    })

    expect(registry.wraps.has('will-be-removed')).toBe(true)

    // Simulate a fresh render that does not re-register the Submodel.
    beginRender(registry)
    pruneUnseenScopes(registry)

    expect(registry.wraps.has('will-be-removed')).toBe(false)
  })

  it('returns a stable dispatch reference for the same scope', () => {
    submodel({
      id: 'child-1',
      view: () => {
        const first = requireDispatch()
        const second = requireDispatch()
        expect(first).toBe(second)
        return h('div')
      },
      model: {},
      wrapWith: GotChild,
      wrapArgs: { entryId: 'child-1' },
    })
  })

  it('applies emit handler instead of wrapWith for matching child message tags', () => {
    type Selected = Readonly<{ _tag: 'Selected'; value: number }>
    type EmitParentMessage = Readonly<{
      _tag: 'AcknowledgedSelection'
      value: number
    }>

    const selectingView = (model: { value: number }) => {
      const dispatch = requireDispatch()
      return h('button', {
        on: {
          click: () =>
            dispatch({
              _tag: 'Selected',
              value: model.value,
            } satisfies Selected),
        },
      })
    }

    const result = submodel({
      id: 'selector',
      view: selectingView,
      model: { value: 42 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'selector' },
      emit: {
        Selected: ({ value }: Selected): EmitParentMessage => ({
          _tag: 'AcknowledgedSelection',
          value,
        }),
      },
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([{ _tag: 'AcknowledgedSelection', value: 42 }])
  })

  it('falls back to wrapWith for child message tags not in emit', () => {
    type Selected = Readonly<{ _tag: 'Selected'; value: number }>
    type Other = Readonly<{ _tag: 'Other' }>

    const dispatchingView = (_: object) => {
      const dispatch = requireDispatch()
      return h('button', {
        on: {
          click: () => dispatch({ _tag: 'Other' } satisfies Other),
        },
      })
    }

    const result = submodel({
      id: 'mixed',
      view: dispatchingView,
      model: {},
      wrapWith: GotChild,
      wrapArgs: { entryId: 'mixed' },
      emit: {
        Selected: ({ value }: Selected) => ({
          _tag: 'AcknowledgedSelection',
          value,
        }),
      },
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        entryId: 'mixed',
        message: { _tag: 'Other' },
      },
    ])
  })

  it('lets emit results continue up the outer wrap chain', () => {
    type Saved = Readonly<{ _tag: 'Saved' }>
    type OuterParentMessage = Readonly<{
      _tag: 'GotOuter'
      message: { readonly _tag: 'Acknowledged' }
    }>
    const GotOuter = (args: {
      message: { readonly _tag: 'Acknowledged' }
    }): OuterParentMessage => ({ _tag: 'GotOuter', ...args })

    const savingView = (_: object) => {
      const dispatch = requireDispatch()
      return h('button', {
        on: {
          click: () => dispatch({ _tag: 'Saved' } satisfies Saved),
        },
      })
    }

    const result = submodel({
      id: 'outer',
      view: () =>
        submodel({
          id: 'inner',
          view: savingView,
          model: {},
          wrapWith: GotChild,
          wrapArgs: { entryId: 'inner' },
          emit: {
            Saved: (_: Saved) => ({ _tag: 'Acknowledged' as const }),
          },
        }),
      model: {},
      wrapWith: GotOuter,
      wrapArgs: {},
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([
      {
        _tag: 'GotOuter',
        message: { _tag: 'Acknowledged' },
      },
    ])
  })
})
