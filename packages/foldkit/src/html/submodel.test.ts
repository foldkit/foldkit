import { describe, it } from '@effect/vitest'
import { Context } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { list } from './list.js'
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
} from './scope.js'
import {
  type SubmodelView as SubmodelViewBranded,
  submodel,
} from './submodel.js'

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

  it('keeps wraps registered across renders when the Submodel is not re-called (h.list cache hit)', () => {
    // Simulates what happens when h.list cache-hits a row: the entry view
    // is not called, so h.submodel inside is not called, so registerScopeWrap
    // is not invoked. The wrap from the previous render must remain so
    // dispatches from the cached vnode continue to route correctly.
    submodel({
      id: 'cached-row',
      view: childView,
      model: { value: 1 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'cached-row' },
    })

    expect(registry.wraps.has('cached-row')).toBe(true)

    // Begin a new render but never re-call submodel for this scope.
    beginRender(registry)

    // The wrap must persist — the cached vnode in the DOM still needs it.
    expect(registry.wraps.has('cached-row')).toBe(true)
  })

  it('deregisters the wrap when the returned vnode is destroyed by snabbdom', () => {
    const result = submodel({
      id: 'destroyable',
      view: childView,
      model: { value: 1 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'destroyable' },
    })

    expect(registry.wraps.has('destroyable')).toBe(true)

    // Simulate snabbdom removing this vnode from the DOM tree.
    const destroyHook = result?.data?.hook?.destroy
    expect(destroyHook).toBeDefined()
    destroyHook!(result!)

    expect(registry.wraps.has('destroyable')).toBe(false)
  })

  it('composes the user-supplied destroy hook with the scope cleanup hook', () => {
    let userDestroyCalled = false
    const viewWithDestroy = (_: { value: number }) => {
      const dispatch = requireDispatch()
      return h('button', {
        on: {
          click: () =>
            dispatch({
              _tag: 'ChildClicked',
              value: 0,
            } satisfies ChildMessage),
        },
        hook: {
          destroy: () => {
            userDestroyCalled = true
          },
        },
      })
    }

    const result = submodel({
      id: 'with-user-destroy',
      view: viewWithDestroy,
      model: { value: 0 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'with-user-destroy' },
    })

    const destroyHook = result?.data?.hook?.destroy
    destroyHook!(result!)

    expect(userDestroyCalled).toBe(true)
    expect(registry.wraps.has('with-user-destroy')).toBe(false)
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

  it('throws when two h.submodel calls share the same id in the same parent scope', () => {
    submodel({
      id: 'shared',
      view: childView,
      model: { value: 1 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'shared' },
    })

    expect(() =>
      submodel({
        id: 'shared',
        view: childView,
        model: { value: 2 },
        wrapWith: GotChild,
        wrapArgs: { entryId: 'shared' },
      }),
    ).toThrow(/duplicate h\.submodel id "shared"/)
  })

  it('runs slot callbacks in the parent scope so handlers dispatch unwrapped', () => {
    // The slot callback constructs a VNode with a handler that dispatches
    // a parent-level Message directly. With slot-scope wrapping, that
    // handler captures the OUTER (root) scope's dispatch, so the Message
    // reaches outerDispatch unwrapped — NOT wrapped by the submodel's
    // GotChild constructor.
    type ParentDirect = Readonly<{ _tag: 'ParentDirect' }>

    type CheckboxLikeInputs = Readonly<{
      toView: (
        attributes: ReadonlyArray<{
          readonly _tag: string
          readonly [key: string]: unknown
        }>,
      ) => unknown
    }>

    const fakeCheckboxView = (_model: object, inputs: CheckboxLikeInputs) => {
      // Inside the Submodel scope: dispatch captured here goes through
      // the Submodel's wrapWith.
      const childDispatch = requireDispatch()
      const internalButton = h('button', {
        on: {
          click: () =>
            childDispatch({
              _tag: 'ChildClicked',
              value: 1,
            } satisfies ChildMessage),
        },
      })
      // Hand the inner button to the consumer's slot callback. The slot
      // callback runs in the PARENT scope; any dispatch it constructs
      // should reach outerDispatch unwrapped.
      inputs.toView([])
      return internalButton
    }

    let parentHandlerCalledDispatch: DispatchSync | null = null
    submodel({
      id: 'fake-checkbox',
      view: fakeCheckboxView,
      model: {},
      inputs: {
        toView: () => {
          // This callback runs inside `view` but the runtime should have
          // swapped back to the parent scope. Snapshot the dispatch the
          // parent would use right here.
          parentHandlerCalledDispatch = requireDispatch()
          return undefined
        },
      },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'fake-checkbox' },
    })

    expect(parentHandlerCalledDispatch).not.toBeNull()
    // Dispatch a parent-level Message through the snapshot. It should
    // reach `dispatched` without being wrapped by GotChild.
    parentHandlerCalledDispatch!({
      _tag: 'ParentDirect',
    } satisfies ParentDirect)
    expect(dispatched).toEqual([{ _tag: 'ParentDirect' }])
  })

  it('infers ChildMessage from the view brand so wrapWith destructures without annotation', () => {
    // Compile-time check: by passing `selectingView` (which is branded
    // with `Selected`), TS infers ChildMessage = Selected, so the
    // wrapWith handler can destructure `{ message: { value } }` and TS
    // knows `value` is a number.
    type Selected = Readonly<{ _tag: 'Selected'; value: number }>
    type SelectedOnly = Selected

    const selectingView: SubmodelViewBranded<
      { value: number },
      SelectedOnly
    > = (model: { value: number }) => {
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
      id: 'inference-check',
      view: selectingView,
      model: { value: 11 },
      // No annotation on `{ message }`:
      wrapWith: ({ message }) => ({
        _tag: 'GotSelected' as const,
        // TS sees `message.value` as number because ChildMessage is
        // inferred as `Selected`.
        plusOne: message.value + 1,
      }),
      wrapArgs: {},
    })

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClick = result?.data?.on?.click as () => void
    onClick()

    expect(dispatched).toEqual([{ _tag: 'GotSelected', plusOne: 12 }])
  })

  it('returns null and deregisters the wrap when the view returns null', () => {
    const nullView: SubmodelViewBranded<{ value: number }, ChildMessage> = () =>
      null

    const result = submodel({
      id: 'null-view',
      view: nullView,
      model: { value: 1 },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'null-view' },
    })

    expect(result).toBeNull()
    // No vnode means no destroy hook will ever fire, so the wrap must be
    // deregistered eagerly to avoid a leak.
    expect(registry.wraps.has('null-view')).toBe(false)
  })

  it('allows the same id under different parent scopes without throwing', () => {
    // Two h.submodel calls share the literal id "child" but live under
    // different parent scopes, so their composed scope ids differ. This
    // must not trip the duplicate-id guard, which is intentionally per
    // parent scope, not global.
    expect(() => {
      submodel({
        id: 'parent-a',
        view: () =>
          submodel({
            id: 'child',
            view: childView,
            model: { value: 1 },
            wrapWith: GotChild,
            wrapArgs: { entryId: 'a' },
          }),
        model: {},
        wrapWith: ({ message }) => ({ _tag: 'GotA' as const, message }),
        wrapArgs: {},
      })

      submodel({
        id: 'parent-b',
        view: () =>
          submodel({
            id: 'child',
            view: childView,
            model: { value: 2 },
            wrapWith: GotChild,
            wrapArgs: { entryId: 'b' },
          }),
        model: {},
        wrapWith: ({ message }) => ({ _tag: 'GotB' as const, message }),
        wrapArgs: {},
      })
    }).not.toThrow()

    expect(registry.wraps.has('parent-a|child')).toBe(true)
    expect(registry.wraps.has('parent-b|child')).toBe(true)
  })

  it('survives h.list reorder: cached entries keep their wraps registered', () => {
    // Build a row view that calls h.submodel for an inner child. h.list
    // memoizes per key, so reordering the items array reuses the same
    // vnodes (and therefore the same registered wraps). The row view is
    // not re-invoked, and the inner submodel is not re-called.
    type Item = Readonly<{ id: string; value: number }>

    const rowView = (item: Item): VNode | null =>
      submodel({
        id: item.id,
        view: childView,
        model: { value: item.value },
        wrapWith: GotChild,
        wrapArgs: { entryId: item.id },
      })

    const itemsForward: ReadonlyArray<Item> = [
      { id: 'row-1', value: 10 },
      { id: 'row-2', value: 20 },
      { id: 'row-3', value: 30 },
    ]

    const firstRender = list(itemsForward, item => item.id, rowView)
    expect(firstRender).toHaveLength(3)
    expect(registry.wraps.has('row-1')).toBe(true)
    expect(registry.wraps.has('row-2')).toBe(true)
    expect(registry.wraps.has('row-3')).toBe(true)

    // Start a new render and reverse the order. h.list cache-hits each
    // row by key, so rowView is not called and submodel does not re-run.
    beginRender(registry)
    const itemsReversed: ReadonlyArray<Item> = [
      itemsForward[2]!,
      itemsForward[1]!,
      itemsForward[0]!,
    ]
    const secondRender = list(itemsReversed, item => item.id, rowView)

    expect(secondRender.map(vnode => vnode?.key)).toEqual([
      'row-3',
      'row-2',
      'row-1',
    ])
    expect(registry.wraps.has('row-1')).toBe(true)
    expect(registry.wraps.has('row-2')).toBe(true)
    expect(registry.wraps.has('row-3')).toBe(true)

    // Cached vnodes still dispatch through the live wraps.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const onClickRow1 = secondRender[2]?.data?.on?.click as () => void
    onClickRow1()
    expect(dispatched).toEqual([
      {
        _tag: 'GotChild',
        entryId: 'row-1',
        message: { _tag: 'ChildClicked', value: 10 },
      },
    ])
  })

  it('nests h.submodel calls made inside a slot callback under the parent scope', () => {
    // A consumer's slot callback can itself embed a Submodel via
    // h.submodel. The slot runs in the PARENT scope (per
    // wrapInputsForOuterScope), so the inner submodel's composed scope
    // should hang off the parent, not the outer Submodel; and its
    // dispatches should NOT be wrapped by the outer Submodel's wrapWith.
    type ParentSlotMessage = Readonly<{
      _tag: 'GotSlotChild'
      message: ChildMessage
    }>
    const GotSlotChild = (args: {
      message: ChildMessage
    }): ParentSlotMessage => ({ _tag: 'GotSlotChild', ...args })

    type ShellInputs = Readonly<{ slot: () => VNode | null }>
    const shellView = (_: object, inputs: ShellInputs): VNode | null => {
      const slotVNode = inputs.slot()
      return h('div', {}, [slotVNode ?? h('span')])
    }

    submodel({
      id: 'shell',
      view: shellView,
      model: {},
      inputs: {
        slot: () =>
          submodel({
            id: 'slot-child',
            view: childView,
            model: { value: 5 },
            wrapWith: GotSlotChild,
            wrapArgs: {},
          }),
      },
      wrapWith: GotChild,
      wrapArgs: { entryId: 'shell' },
    })

    // The slot's submodel registers under the parent (root) scope, NOT
    // under "shell|slot-child", because the slot callback ran in the
    // outer scope.
    expect(registry.wraps.has('slot-child')).toBe(true)
    expect(registry.wraps.has('shell|slot-child')).toBe(false)
  })
})
