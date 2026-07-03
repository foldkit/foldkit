import { Context, Effect, Queue, Stream } from 'effect'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { m } from '../message/index.js'
import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { noOpDispatch } from '../runtime/crashUI.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import type { BoundaryRegistry } from './boundary.js'
import { childAttributes } from './childAttribute.js'
import {
  type ChildAttribute,
  __beginRender as beginHtmlRender,
  __beginReplayRender as beginReplayRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  defineView,
  __endReplayRender as endReplayRender,
  html,
  __setRuntime as setHtmlRuntime,
} from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const Unmounted = m('Unmounted')
const Mounted = m('Mounted')

const createCapturingDispatch = () => {
  const dispatched: Array<unknown> = []
  const dispatch = Dispatch.of({
    dispatchAsync: () => Effect.void,
    dispatchSync: message => {
      dispatched.push(message)
    },
  })
  return { dispatch, dispatched }
}

const renderView = (
  buildView: () => VNode | null,
  dispatch: typeof Dispatch.Service,
): VNode => {
  const testContext = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  setHtmlRuntime(dispatch.dispatchSync, testContext)
  let vnode: VNode | null
  try {
    vnode = buildView()
  } finally {
    clearHtmlRuntime()
  }
  if (vnode === null) {
    throw new Error('renderView received a null VNode')
  }
  return vnode
}

const makeRootContainer = (): HTMLElement => document.createElement('div')

describe('OnUnmount', () => {
  it('dispatches the Message when the element is removed by a parent re-render', () => {
    const h = html<typeof Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const withChild = () => h.div([], [h.span([h.OnUnmount(Unmounted())], [])])
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    expect(dispatched).toStrictEqual([])

    patch(mounted, renderView(withoutChild, dispatch))

    expect(dispatched).toStrictEqual([Unmounted()])
  })

  it('dispatches the Message when the element is removed by a key change', () => {
    const h = html<typeof Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const buildView = (key: string) => () =>
      h.div([], [h.span([h.Key(key), h.OnUnmount(Unmounted())], [])])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(buildView('a'), dispatch),
    )

    patch(mounted, renderView(buildView('b'), dispatch))

    expect(dispatched).toStrictEqual([Unmounted()])
  })

  it('dispatches when an ancestor keyed node is replaced, removing the element as a descendant', () => {
    const h = html<typeof Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    // The element carrying OnUnmount is nested below the keyed node, mirroring
    // a dialog inside route-keyed content. Changing the ancestor's key replaces
    // the whole subtree, so the descendant's destroy hook must fire.
    const buildView = (key: string) => () =>
      h.div(
        [],
        [
          h.div(
            [h.Key(key)],
            [h.div([], [h.span([h.OnUnmount(Unmounted())], [])])],
          ),
        ],
      )

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(buildView('routeA'), dispatch),
    )

    patch(mounted, renderView(buildView('routeB'), dispatch))

    expect(dispatched).toStrictEqual([Unmounted()])
  })

  it('does not dispatch the Message during a replay render window', () => {
    const h = html<typeof Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const withChild = () => h.div([], [h.span([h.OnUnmount(Unmounted())], [])])
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    // Mirror the runtime's replay path: the replayed tree is built with a
    // no-op dispatch while the replay window is open, then patched in. The
    // destroy hook fires against the prior live tree's captured dispatch, so
    // the window is the only thing that suppresses it.
    beginReplayRender()
    try {
      patch(mounted, renderView(withoutChild, Dispatch.of(noOpDispatch)))
    } finally {
      endReplayRender()
    }

    expect(dispatched).toStrictEqual([])
  })

  it('dispatches again on a normal unmount after the replay window has closed', () => {
    const h = html<typeof Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const withChild = () => h.div([], [h.span([h.OnUnmount(Unmounted())], [])])
    const withoutChild = () => h.div([], [])

    const firstMount = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    beginReplayRender()
    try {
      patch(firstMount, renderView(withoutChild, Dispatch.of(noOpDispatch)))
    } finally {
      endReplayRender()
    }

    const secondMount = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )
    patch(secondMount, renderView(withoutChild, dispatch))

    expect(dispatched).toStrictEqual([Unmounted()])
  })

  it('composes with an OnMount destroy hook on the same element', async () => {
    const h = html<typeof Unmounted.Type | typeof Mounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const action: MountAction<typeof Mounted.Type> = {
      name: 'Mounted',
      f: () =>
        Stream.callback<typeof Mounted.Type>(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                Queue.offerUnsafe(queue, Mounted())
              }),
              () =>
                Effect.sync(() => {
                  cleanupCalls += 1
                }),
            )
            return yield* Effect.never
          }),
        ),
    }

    const withChild = () =>
      h.div([], [h.span([h.OnMount(action), h.OnUnmount(Unmounted())], [])])
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toContainEqual(Mounted())
    })

    patch(mounted, renderView(withoutChild, dispatch))

    expect(dispatched).toContainEqual(Unmounted())
    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
  })

  it('composes regardless of attribute order with OnUnmount first', async () => {
    const h = html<typeof Unmounted.Type | typeof Mounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const action: MountAction<typeof Mounted.Type> = {
      name: 'Mounted',
      f: () =>
        Stream.callback<typeof Mounted.Type>(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                Queue.offerUnsafe(queue, Mounted())
              }),
              () =>
                Effect.sync(() => {
                  cleanupCalls += 1
                }),
            )
            return yield* Effect.never
          }),
        ),
    }

    const withChild = () =>
      h.div([], [h.span([h.OnUnmount(Unmounted()), h.OnMount(action)], [])])
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toContainEqual(Mounted())
    })

    patch(mounted, renderView(withoutChild, dispatch))

    expect(dispatched).toContainEqual(Unmounted())
    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
  })
})

type ChildUnmounted = Readonly<{ _tag: 'ChildUnmounted' }>
const ChildUnmounted: ChildUnmounted = { _tag: 'ChildUnmounted' }
type GotChildMessage = Readonly<{
  _tag: 'GotChildMessage'
  message: ChildUnmounted
}>
const GotChildMessage = (message: ChildUnmounted): GotChildMessage => ({
  _tag: 'GotChildMessage',
  message,
})

type ChildViewInputs = Readonly<{
  toView: (dialog: ReadonlyArray<ChildAttribute>) => VNode | null
}>

// A Submodel that publishes an OnUnmount attribute through its boundary,
// mirroring how Ui.Dialog publishes `dialog` attributes carrying OnUnmount.
const childView = defineView<
  Readonly<{ id: string }>,
  ChildUnmounted,
  ChildViewInputs
>((_model, viewInputs) => {
  const childHtml = html<ChildUnmounted>()
  return viewInputs.toView(
    childAttributes([
      childHtml.Id('child-dialog'),
      childHtml.OnUnmount(ChildUnmounted),
    ]),
  )
})

// Renders with a persistent boundary registry shared across renders and a
// `beginRender` call each pass, matching how the runtime drives Submodel
// boundaries. The plain `renderView` above creates a fresh registry per call,
// which is fine for boundary-free elements but would break boundary continuity.
const renderViewWithRegistry = (
  buildView: () => VNode | null,
  dispatch: typeof Dispatch.Service,
  registry: BoundaryRegistry,
): VNode => {
  const testContext = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  beginHtmlRender(registry)
  setHtmlRuntime(dispatch.dispatchSync, testContext, registry)
  let vnode: VNode | null
  try {
    vnode = buildView()
  } finally {
    clearHtmlRuntime()
  }
  if (vnode === null) {
    throw new Error('renderViewWithRegistry received a null VNode')
  }
  return vnode
}

describe('OnUnmount across a Submodel boundary', () => {
  it('dispatches the parent-wrapped Message when the boundary is torn down', () => {
    const h = html<GotChildMessage>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const registry = createHtmlBoundaryRegistry()

    // The OnUnmount-bearing element lives inside the Submodel, which is
    // removed entirely on the second render. The Submodel's own destroy hook
    // deregisters its boundary wrap during the same patch, so a fire-time
    // boundary lookup in OnUnmount would crash with `dispatchAcrossBoundary
    // missing wrap`. Eager resolution at build time must avoid that race.
    const withChild = () =>
      h.div(
        [],
        [
          h.submodel({
            slotId: 'child-dialog',
            model: { id: 'child-dialog' },
            view: childView,
            viewInputs: {
              toView: dialog => h.dialog([...dialog], []),
            },
            toParentMessage: message => GotChildMessage(message),
          }),
        ],
      )
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderViewWithRegistry(withChild, dispatch, registry),
    )

    patch(mounted, renderViewWithRegistry(withoutChild, dispatch, registry))

    expect(dispatched).toStrictEqual([GotChildMessage(ChildUnmounted)])
  })
})
