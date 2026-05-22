import { describe, it } from '@effect/vitest'
import { Context } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
  registerBoundaryWrap,
} from './boundary.js'
import { createKeyedLazy } from './lazy.js'
import {
  type DispatchSync,
  clearRuntime,
  pushBoundary,
  requireDispatch,
  setRuntime,
} from './runtimeSingleton.js'
import {
  type SubmodelView as SubmodelViewBranded,
  defineView,
  submodel,
} from './submodel.js'

const setUpRuntime = (
  registry: BoundaryRegistry,
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

// NOTE: mirrors how `h.OnClick` captures dispatch in the html factory:
// at VNode-construction time, while the current boundary is still the
// Submodel's boundary. Calling `requireDispatch()` inside the click
// handler would resolve at fire time when the boundary has already
// been popped.
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
  let registry: BoundaryRegistry
  let dispatched: Array<unknown>

  beforeEach(() => {
    registry = createBoundaryRegistry()
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
      toParentMessage: message => GotChild({ entryId: 'child-1', message }),
    })

    expect(result).not.toBeNull()
    expect(result?.sel).toBe('button')
  })

  it('wraps child messages dispatched inside the Submodel', () => {
    const result = submodel({
      id: 'child-1',
      view: childView,
      model: { value: 7 },
      toParentMessage: message => GotChild({ entryId: 'child-1', message }),
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
          toParentMessage: message => GotChild({ entryId: 'child-1', message }),
        }),
      model: {},
      toParentMessage: message => GotParent({ message }),
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
      toParentMessage: message => GotChild({ entryId: 'with-inputs', message }),
    })

    expect(result?.text).toBe('count: 3')
  })

  it('preserves outer boundary after the Submodel call returns', () => {
    // NOTE: register a wrap for the outer boundary the way h.submodel
    // pairs registerBoundaryWrap with pushBoundary in real code. A
    // boundary pushed without a registered wrap is undefined behavior;
    // `dispatchAcrossBoundary` throws if a chain wrap is missing, since
    // a missing wrap implies a corrupted registry (e.g. a Submodel
    // unmounted between event scheduling and dispatch).
    registerBoundaryWrap(registry, 'outer', {
      toParentMessage: message => ({ _tag: 'GotOuter', inner: message }),
    })
    pushBoundary('outer')
    try {
      submodel({
        id: 'inner',
        view: () => h('span'),
        model: {},
        toParentMessage: message => GotChild({ entryId: 'inner', message }),
      })

      const dispatchSyncAfter = requireDispatch()
      dispatchSyncAfter({ _tag: 'AfterReturn' })

      // After Submodel returns, the dispatch returned by requireDispatch
      // is the outer boundary's dispatch (not the inner Submodel's), so
      // the message routes through the outer wrap only.
      expect(dispatched).toEqual([
        { _tag: 'GotOuter', inner: { _tag: 'AfterReturn' } },
      ])
    } finally {
      clearRuntime()
    }
  })

  it('keeps wraps registered across renders when the Submodel is not re-called (createKeyedLazy cache hit)', () => {
    // NOTE: simulates what happens when a createKeyedLazy cache-hits a
    // row: the entry view is not called, so h.submodel inside is not
    // called, so registerBoundaryWrap is not invoked. The wrap from the
    // previous render must remain so dispatches from the cached vnode
    // continue
    // to route correctly.
    submodel({
      id: 'cached-row',
      view: childView,
      model: { value: 1 },
      toParentMessage: message => GotChild({ entryId: 'cached-row', message }),
    })

    expect(registry.wraps.has('cached-row')).toBe(true)

    // Begin a new render but never re-call submodel for this boundary.
    beginRender(registry)

    // The wrap must persist — the cached vnode in the DOM still needs it.
    expect(registry.wraps.has('cached-row')).toBe(true)
  })

  it('deregisters the wrap when the returned vnode is destroyed by snabbdom', () => {
    const result = submodel({
      id: 'destroyable',
      view: childView,
      model: { value: 1 },
      toParentMessage: message => GotChild({ entryId: 'destroyable', message }),
    })

    expect(registry.wraps.has('destroyable')).toBe(true)

    // Simulate snabbdom removing this vnode from the DOM tree.
    const destroyHook = result?.data?.hook?.destroy
    expect(destroyHook).toBeDefined()
    destroyHook!(result!)

    expect(registry.wraps.has('destroyable')).toBe(false)
  })

  it('composes the user-supplied destroy hook with the boundary cleanup hook', () => {
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
      toParentMessage: message =>
        GotChild({ entryId: 'with-user-destroy', message }),
    })

    const destroyHook = result?.data?.hook?.destroy
    destroyHook!(result!)

    expect(userDestroyCalled).toBe(true)
    expect(registry.wraps.has('with-user-destroy')).toBe(false)
  })

  it('returns a stable dispatch reference for the same boundary', () => {
    submodel({
      id: 'child-1',
      view: () => {
        const first = requireDispatch()
        const second = requireDispatch()
        expect(first).toBe(second)
        return h('div')
      },
      model: {},
      toParentMessage: message => GotChild({ entryId: 'child-1', message }),
    })
  })

  it('throws when two h.submodel calls share the same id in the same parent boundary', () => {
    submodel({
      id: 'shared',
      view: childView,
      model: { value: 1 },
      toParentMessage: message => GotChild({ entryId: 'shared', message }),
    })

    expect(() =>
      submodel({
        id: 'shared',
        view: childView,
        model: { value: 2 },
        toParentMessage: message => GotChild({ entryId: 'shared', message }),
      }),
    ).toThrow(/duplicate h\.submodel id "shared"/)
  })

  it('runs slot callbacks in the parent boundary so handlers dispatch unwrapped', () => {
    // The slot callback constructs a VNode with a handler that dispatches
    // a parent-level Message directly. With slot-boundary wrapping, that
    // handler captures the OUTER (root) boundary's dispatch, so the Message
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
      // Inside the Submodel boundary: dispatch captured here goes through
      // the Submodel's toParentMessage.
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
      // callback runs in the PARENT boundary; any dispatch it constructs
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
          // swapped back to the parent boundary. Snapshot the dispatch the
          // parent would use right here.
          parentHandlerCalledDispatch = requireDispatch()
          return undefined
        },
      },
      toParentMessage: message =>
        GotChild({ entryId: 'fake-checkbox', message }),
    })

    expect(parentHandlerCalledDispatch).not.toBeNull()
    // Dispatch a parent-level Message through the snapshot. It should
    // reach `dispatched` without being wrapped by GotChild.
    parentHandlerCalledDispatch!({
      _tag: 'ParentDirect',
    } satisfies ParentDirect)
    expect(dispatched).toEqual([{ _tag: 'ParentDirect' }])
  })

  it('infers ChildMessage from the view brand so toParentMessage destructures without annotation', () => {
    // Compile-time check: by passing `selectingView` (which is branded
    // with `Selected`), TS infers ChildMessage = Selected, so the
    // toParentMessage handler receives `{ value }` directly and TS knows
    // `value` is a number.
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
      toParentMessage: message => ({
        _tag: 'GotSelected' as const,
        // TS sees `message.value` as number because ChildMessage is
        // inferred as `Selected`.
        plusOne: message.value + 1,
      }),
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
      toParentMessage: message => GotChild({ entryId: 'null-view', message }),
    })

    expect(result).toBeNull()
    // No vnode means no destroy hook will ever fire, so the wrap must be
    // deregistered eagerly to avoid a leak.
    expect(registry.wraps.has('null-view')).toBe(false)
  })

  it('allows the same id under different parent boundaries without throwing', () => {
    // Two h.submodel calls share the literal id "child" but live under
    // different parent boundaries, so their composed boundary ids differ. This
    // must not trip the duplicate-id guard, which is intentionally per
    // parent boundary, not global.
    expect(() => {
      submodel({
        id: 'parent-a',
        view: () =>
          submodel({
            id: 'child',
            view: childView,
            model: { value: 1 },
            toParentMessage: message => GotChild({ entryId: 'a', message }),
          }),
        model: {},
        toParentMessage: message => ({ _tag: 'GotA' as const, message }),
      })

      submodel({
        id: 'parent-b',
        view: () =>
          submodel({
            id: 'child',
            view: childView,
            model: { value: 2 },
            toParentMessage: message => GotChild({ entryId: 'b', message }),
          }),
        model: {},
        toParentMessage: message => ({ _tag: 'GotB' as const, message }),
      })
    }).not.toThrow()

    expect(registry.wraps.has('parent-a|child')).toBe(true)
    expect(registry.wraps.has('parent-b|child')).toBe(true)
  })

  it('survives createKeyedLazy reorder: cached entries keep their wraps registered', () => {
    // Build a row view that calls h.submodel for an inner child.
    // createKeyedLazy memoizes per key, so reordering the items array
    // reuses the same vnodes (and therefore the same registered wraps).
    // The row view is not re-invoked, and the inner submodel is not
    // re-called.
    type Item = Readonly<{ id: string; value: number }>

    const rowView = (item: Item): VNode | null =>
      submodel({
        id: item.id,
        view: childView,
        model: { value: item.value },
        toParentMessage: message => GotChild({ entryId: item.id, message }),
      })

    const lazyRow = createKeyedLazy()
    const renderRow = (item: Item): VNode | null => {
      const vnode = lazyRow(item.id, rowView, [item])
      if (vnode !== null && vnode.key !== item.id) {
        vnode.key = item.id
      }
      return vnode
    }

    const itemsForward: ReadonlyArray<Item> = [
      { id: 'row-1', value: 10 },
      { id: 'row-2', value: 20 },
      { id: 'row-3', value: 30 },
    ]

    const firstRender = itemsForward.map(renderRow)
    expect(firstRender).toHaveLength(3)
    expect(registry.wraps.has('row-1')).toBe(true)
    expect(registry.wraps.has('row-2')).toBe(true)
    expect(registry.wraps.has('row-3')).toBe(true)

    // Start a new render and reverse the order. createKeyedLazy cache-hits
    // each row by key, so rowView is not called and submodel does not
    // re-run.
    beginRender(registry)
    const itemsReversed: ReadonlyArray<Item> = [
      itemsForward[2]!,
      itemsForward[1]!,
      itemsForward[0]!,
    ]
    const secondRender = itemsReversed.map(renderRow)

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

  it('nests h.submodel calls made inside a slot callback under the parent boundary', () => {
    // A consumer's slot callback can itself embed a Submodel via
    // h.submodel. The slot runs in the PARENT boundary (per
    // wrapInputsForOuterBoundary), so the inner submodel's composed boundary
    // should hang off the parent, not the outer Submodel; and its
    // dispatches should NOT be wrapped by the outer Submodel's toParentMessage.
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
            toParentMessage: message => GotSlotChild({ message }),
          }),
      },
      toParentMessage: message => GotChild({ entryId: 'shell', message }),
    })

    // The slot's submodel registers under the parent (root) boundary, NOT
    // under "shell|slot-child", because the slot callback ran in the
    // outer boundary.
    expect(registry.wraps.has('slot-child')).toBe(true)
    expect(registry.wraps.has('shell|slot-child')).toBe(false)
  })

  it('throws when a function value is nested inside `inputs` below the top level', () => {
    // Top-level functions in `inputs` get auto-scoped to the parent
    // boundary so handlers built inside them dispatch through the
    // parent's wrapping chain. A function nested inside an object value
    // would silently capture the child's boundary instead, almost
    // never what the consumer intended. Fail loud at view-build time.
    type NestedInputs = Readonly<{
      config: Readonly<{ onSubmit: () => unknown }>
    }>
    const viewWithNested = (_model: object, _inputs: NestedInputs) => h('div')

    expect(() =>
      submodel({
        id: 'nested-fn',
        view: viewWithNested,
        model: {},
        inputs: {
          config: {
            onSubmit: () => undefined,
          },
        },
        toParentMessage: message => GotChild({ entryId: 'nested-fn', message }),
      }),
    ).toThrow(/inputs\.config\.onSubmit/)
  })

  it('rejects nested-function inputs at the type level (compile-time check)', () => {
    // NOTE: paired type-level companion to the runtime throw above. The
    // runtime test uses an unbranded view (its `viewWithNested` doesn't go
    // through defineView), which loosens the `SubmodelView` constraint
    // enough that `ValidatedInputs` doesn't fire on it. This test uses a
    // properly-branded view so the constraint flows through. If a future
    // refactor to `ValidatedInputs` silently degrades it to a passthrough,
    // the `@ts-expect-error` below stops firing and tsc fails ("unused
    // @ts-expect-error directive"), surfacing the regression even though
    // the runtime test still passes.
    type NestedTypeTestInputs = Readonly<{
      config: Readonly<{ onSubmit: () => unknown }>
    }>
    const brandedView = defineView<
      { value: number },
      Readonly<{ _tag: 'TypeCheckNoop' }>,
      NestedTypeTestInputs
    >((_model, _inputs) => h('div'))

    expect(() =>
      submodel({
        id: 'type-check',
        view: brandedView,
        model: { value: 0 },
        inputs: {
          // @ts-expect-error — ValidatedInputs<NestedTypeTestInputs>
          // forbids functions nested below the top level of `inputs`.
          // If this directive stops being needed, ValidatedInputs has
          // regressed.
          config: { onSubmit: () => undefined },
        },
        toParentMessage: () => ({ _tag: 'TypeCheckNoop' }) as const,
      }),
    ).toThrow(/inputs\.config\.onSubmit/)
  })
})
