import { Context, Option } from 'effect'
import { h } from 'snabbdom'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

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
      slotId: 'child-1',
      model: { value: 42 },
      view: childView,
      toParentMessage: message => GotChild({ entryId: 'child-1', message }),
    })

    expect(result).not.toBeNull()
    expect(result?.sel).toBe('button')
  })

  it('wraps child messages dispatched inside the Submodel', () => {
    const result = submodel({
      slotId: 'child-1',
      model: { value: 7 },
      view: childView,
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
      slotId: 'parent',
      model: {},
      view: () =>
        submodel({
          slotId: 'child-1',
          model: { value: 99 },
          view: childView,
          toParentMessage: message => GotChild({ entryId: 'child-1', message }),
        }),
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

  it('passes viewInputs as the second view argument when provided', () => {
    const viewWithInputs = (
      model: { value: number },
      viewInputs: { label: string },
    ) => h('div', `${viewInputs.label}: ${model.value}`)

    const result = submodel({
      slotId: 'with-viewInputs',
      model: { value: 3 },
      view: viewWithInputs,
      viewInputs: { label: 'count' },
      toParentMessage: message =>
        GotChild({ entryId: 'with-viewInputs', message }),
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
        slotId: 'inner',
        model: {},
        view: () => h('span'),
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
      slotId: 'cached-row',
      model: { value: 1 },
      view: childView,
      toParentMessage: message => GotChild({ entryId: 'cached-row', message }),
    })

    expect(registry.wraps.has('cached-row')).toBe(true)

    // Begin a new render but never re-call submodel for this boundary.
    beginRender(registry)

    // The wrap must persist. The cached vnode in the DOM still needs it.
    expect(registry.wraps.has('cached-row')).toBe(true)
  })

  it('deregisters the wrap when the returned vnode is destroyed by snabbdom', () => {
    const result = submodel({
      slotId: 'destroyable',
      model: { value: 1 },
      view: childView,
      toParentMessage: message => GotChild({ entryId: 'destroyable', message }),
    })

    expect(registry.wraps.has('destroyable')).toBe(true)

    // A genuine unmount: a later render does not re-register the boundary,
    // so `beginRender` clears it from `seenThisRender` before snabbdom
    // removes the vnode and fires destroy.
    beginRender(registry)
    const destroyHook = result?.data?.hook?.destroy
    expect(destroyHook).toBeDefined()
    destroyHook!(result!)

    expect(registry.wraps.has('destroyable')).toBe(false)
  })

  it('preserves the wrap when the old root vnode is destroyed after the boundary was re-registered the same cycle', () => {
    const render = () =>
      submodel({
        slotId: 'remounted',
        model: { value: 1 },
        view: childView,
        toParentMessage: message => GotChild({ entryId: 'remounted', message }),
      })

    // Render N: the keyed root is registered and produces a vnode whose
    // destroy hook fires when snabbdom swaps the root on the next render.
    const first = render()
    const firstDestroy = first?.data?.hook?.destroy
    expect(firstDestroy).toBeDefined()

    // Render N+1: the keyed root's key changed, so the parent re-renders the
    // same boundary, re-registering it before snabbdom patches.
    beginRender(registry)
    render()
    expect(registry.wraps.has('remounted')).toBe(true)

    // Patch N+1: snabbdom removes the OLD root vnode and fires its destroy
    // hook. The wrap from the re-render must survive.
    firstDestroy!(first!)
    expect(registry.wraps.has('remounted')).toBe(true)
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
      slotId: 'with-user-destroy',
      model: { value: 0 },
      view: viewWithDestroy,
      toParentMessage: message =>
        GotChild({ entryId: 'with-user-destroy', message }),
    })

    // Genuine unmount: the boundary is not re-registered this render.
    beginRender(registry)
    const destroyHook = result?.data?.hook?.destroy
    destroyHook!(result!)

    expect(userDestroyCalled).toBe(true)
    expect(registry.wraps.has('with-user-destroy')).toBe(false)
  })

  it('returns a stable dispatch reference for the same boundary', () => {
    submodel({
      slotId: 'child-1',
      model: {},
      view: () => {
        const first = requireDispatch()
        const second = requireDispatch()
        expect(first).toBe(second)
        return h('div')
      },
      toParentMessage: message => GotChild({ entryId: 'child-1', message }),
    })
  })

  it('throws when two h.submodel calls share the same slotId in the same parent boundary', () => {
    submodel({
      slotId: 'shared',
      model: { value: 1 },
      view: childView,
      toParentMessage: message => GotChild({ entryId: 'shared', message }),
    })

    expect(() =>
      submodel({
        slotId: 'shared',
        model: { value: 2 },
        view: childView,
        toParentMessage: message => GotChild({ entryId: 'shared', message }),
      }),
    ).toThrow(/duplicate h\.submodel slotId "shared"/)
  })

  it('runs slot callbacks in the parent boundary so handlers dispatch unwrapped', () => {
    // The slot callback constructs a VNode with a handler that dispatches
    // a parent-level Message directly. With slot-boundary wrapping, that
    // handler captures the OUTER (root) boundary's dispatch, so the Message
    // reaches outerDispatch unwrapped, NOT wrapped by the submodel's
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

    const fakeCheckboxView = (
      _model: object,
      viewInputs: CheckboxLikeInputs,
    ) => {
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
      viewInputs.toView([])
      return internalButton
    }

    let parentHandlerCalledDispatch: DispatchSync | null = null
    submodel({
      slotId: 'fake-checkbox',
      model: {},
      view: fakeCheckboxView,
      viewInputs: {
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
      slotId: 'inference-check',
      model: { value: 11 },
      view: selectingView,
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
      slotId: 'null-view',
      model: { value: 1 },
      view: nullView,
      toParentMessage: message => GotChild({ entryId: 'null-view', message }),
    })

    expect(result).toBeNull()
    // No vnode means no destroy hook will ever fire, so the wrap must be
    // deregistered eagerly to avoid a leak.
    expect(registry.wraps.has('null-view')).toBe(false)
  })

  it('allows the same slotId under different parent boundaries without throwing', () => {
    // Two h.submodel calls share the literal slotId "child" but live under
    // different parent boundaries, so their composed boundary ids differ. This
    // must not trip the duplicate-slotId guard, which is intentionally per
    // parent boundary, not global.
    expect(() => {
      submodel({
        slotId: 'parent-a',
        model: {},
        view: () =>
          submodel({
            slotId: 'child',
            model: { value: 1 },
            view: childView,
            toParentMessage: message => GotChild({ entryId: 'a', message }),
          }),
        toParentMessage: message => ({ _tag: 'GotA' as const, message }),
      })

      submodel({
        slotId: 'parent-b',
        model: {},
        view: () =>
          submodel({
            slotId: 'child',
            model: { value: 2 },
            view: childView,
            toParentMessage: message => GotChild({ entryId: 'b', message }),
          }),
        toParentMessage: message => ({ _tag: 'GotB' as const, message }),
      })
    }).not.toThrow()

    expect(registry.wraps.has('parent-a|child')).toBe(true)
    expect(registry.wraps.has('parent-b|child')).toBe(true)
  })

  it('throws when a colliding slotId is added across a createKeyedLazy cache hit', () => {
    // NOTE: when a row is behind a createKeyedLazy cache hit its
    // h.submodel does not run, so the boundaryId is not freshly added
    // to seenThisRender this frame. The lazy helpers replay captured
    // ids on cache hit so the duplicate-slotId guard catches a sibling
    // collision against the cached entry instead of silently
    // overwriting its wrap.
    const rowView = (): VNode | null =>
      submodel({
        slotId: 'shared',
        model: { value: 1 },
        view: childView,
        toParentMessage: message => GotChild({ entryId: 'shared', message }),
      })

    const lazyRow = createKeyedLazy()
    const renderRow = (key: string): VNode | null =>
      lazyRow(key, rowView, [key])

    renderRow('row')
    expect(registry.wraps.has('shared')).toBe(true)

    beginRender(registry)
    renderRow('row')

    expect(() =>
      submodel({
        slotId: 'shared',
        model: { value: 2 },
        view: childView,
        toParentMessage: message => GotChild({ entryId: 'shared', message }),
      }),
    ).toThrow(/duplicate h\.submodel slotId "shared"/)
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
        slotId: item.id,
        model: { value: item.value },
        view: childView,
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
    // wrapViewInputsForOuterBoundary), so the inner submodel's composed
    // boundary should hang off the parent, not the outer Submodel; and its
    // dispatches should NOT be wrapped by the outer Submodel's toParentMessage.
    type ParentSlotMessage = Readonly<{
      _tag: 'GotSlotChild'
      message: ChildMessage
    }>
    const GotSlotChild = (args: {
      message: ChildMessage
    }): ParentSlotMessage => ({ _tag: 'GotSlotChild', ...args })

    type ShellInputs = Readonly<{ slot: () => VNode | null }>
    const shellView = (_: object, viewInputs: ShellInputs): VNode | null => {
      const slotVNode = viewInputs.slot()
      return h('div', {}, [slotVNode ?? h('span')])
    }

    submodel({
      slotId: 'shell',
      model: {},
      view: shellView,
      viewInputs: {
        slot: () =>
          submodel({
            slotId: 'slot-child',
            model: { value: 5 },
            view: childView,
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

  it('throws when a function value is nested inside `viewInputs` below the top level', () => {
    // Top-level functions in `viewInputs` get auto-scoped to the parent
    // boundary so handlers built inside them dispatch through the
    // parent's wrapping chain. A function nested inside an object value
    // would silently capture the child's boundary instead, almost
    // never what the consumer intended. Fail loud at view-build time.
    type NestedInputs = Readonly<{
      config: Readonly<{ onSubmit: () => unknown }>
    }>
    const viewWithNested = (_model: object, _viewInputs: NestedInputs) =>
      h('div')

    expect(() =>
      submodel({
        slotId: 'nested-fn',
        model: {},
        view: viewWithNested,
        viewInputs: {
          config: {
            onSubmit: () => undefined,
          },
        },
        toParentMessage: message => GotChild({ entryId: 'nested-fn', message }),
      }),
    ).toThrow(/viewInputs\.config\.onSubmit/)
  })

  it('throws when a function value is nested inside an array element of `viewInputs`', () => {
    // A natural list-shaped API (`viewInputs: { items: [{ onSelect: ... }] }`)
    // is the most common way to accidentally smuggle a function below the
    // top level. The walker iterates arrays and descends into element
    // objects, so the error surfaces at view-build time.
    type ItemsInputs = Readonly<{
      items: ReadonlyArray<Readonly<{ onSelect: () => unknown }>>
    }>
    const viewWithItems = (_model: object, _viewInputs: ItemsInputs) => h('div')

    expect(() =>
      submodel({
        slotId: 'items-fn',
        model: {},
        view: viewWithItems,
        viewInputs: {
          items: [{ onSelect: () => undefined }],
        },
        toParentMessage: message => GotChild({ entryId: 'items-fn', message }),
      }),
    ).toThrow(/viewInputs\.items\.\[0\]\.onSelect/)
  })

  it('accepts Effect data types like Option as top-level input fields', () => {
    // The runtime walker uses `Object.keys` (own properties only), so
    // values whose prototype carries function members like `pipe` are
    // accepted. Models lean on `Option`, `Either`, and similar data
    // types heavily; threading them through `viewInputs` is a common idiom.
    type OptionInputs = Readonly<{ maybeValue: Option.Option<string> }>
    const viewWithOption = (_model: object, _viewInputs: OptionInputs) =>
      h('div')

    expect(() =>
      submodel({
        slotId: 'option-input',
        model: {},
        view: viewWithOption,
        viewInputs: { maybeValue: Option.some('hello') },
        toParentMessage: message =>
          GotChild({ entryId: 'option-input', message }),
      }),
    ).not.toThrow()
  })
})
