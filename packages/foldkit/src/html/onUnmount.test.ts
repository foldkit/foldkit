import { Context, Effect, Layer, Queue, Schema, Stream } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Block, deliver, runtimeBlockOf } from '../blocks/block.js'
import {
  constructSync,
  makeGraph,
  reconcile,
  renderRoot,
} from '../blocks/engine.js'
import { defineMessageUnion } from '../message/index.js'
import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { mountModule } from '../mountModule.js'
import { onUnmountModule } from '../onUnmountModule.js'
import { propsModule } from '../propsModule.js'
import { noOpDispatch } from '../runtime/crashUI.js'
import { Dispatch } from '../runtime/index.js'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from '../snabbdom/index.js'
import { type VNode, dedupeSharedVNodes } from '../vdom.js'
import type { BoundaryRegistry } from './boundary.js'
import { childAttributes } from './childAttribute.js'
import {
  type ChildAttribute,
  __htmlBuilder,
  __beginRender as beginHtmlRender,
  __beginReplayRender as beginReplayRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  __endReplayRender as endReplayRender,
  __flushReplayUnmountsAfterPatchFailure as flushReplayUnmountsAfterPatchFailure,
  __setRuntime as setHtmlRuntime,
} from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  onUnmountModule,
  mountModule,
  propsModule,
  styleModule,
])

const Message = defineMessageUnion({
  Unmounted: {},
  UnmountedNamed: { name: Schema.String },
  Mounted: {},
})
type Message = typeof Message.Type

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
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const withChild = () =>
      h.div([], [h.span([h.OnUnmount(Message.Unmounted())])])
    const withoutChild = () => h.div([])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    expect(dispatched).toStrictEqual([])

    patch(mounted, renderView(withoutChild, dispatch))

    expect(dispatched).toStrictEqual([Message.Unmounted()])
  })

  it('dispatches the Message when the element is removed by a key change', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const buildView = (key: string) => () =>
      h.div([], [h.span([h.Key(key), h.OnUnmount(Message.Unmounted())])])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(buildView('a'), dispatch),
    )

    patch(mounted, renderView(buildView('b'), dispatch))

    expect(dispatched).toStrictEqual([Message.Unmounted()])
  })

  it('dispatches when an ancestor keyed node is replaced, removing the element as a descendant', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
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
            [h.div([], [h.span([h.OnUnmount(Message.Unmounted())])])],
          ),
        ],
      )

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(buildView('routeA'), dispatch),
    )

    patch(mounted, renderView(buildView('routeB'), dispatch))

    expect(dispatched).toStrictEqual([Message.Unmounted()])
  })

  it('does not dispatch the Message during a replay render window', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const withChild = () =>
      h.div([], [h.span([h.OnUnmount(Message.Unmounted())])])
    const withoutChild = () => h.div([])

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

    beginReplayRender()
    try {
      flushReplayUnmountsAfterPatchFailure()
    } finally {
      endReplayRender()
    }

    expect(dispatched).toStrictEqual([])
  })

  it('dispatches a replay-suppressed unmount once when patch recovery destroys the live tree', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const withChild = () =>
      h.div([], [h.span([h.OnUnmount(Message.Unmounted())])])
    const withoutChild = () => h.div([])
    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )
    const child = mounted.children?.[0]
    if (child === undefined || typeof child === 'string') {
      throw new Error('Expected the mounted child VNode')
    }

    beginReplayRender()
    try {
      patch(mounted, renderView(withoutChild, Dispatch.of(noOpDispatch)))
      onUnmountModule.destroy?.(child)
      flushReplayUnmountsAfterPatchFailure()
    } finally {
      endReplayRender()
    }

    expect(dispatched).toStrictEqual([Message.Unmounted()])
  })

  it('preserves the live callback when a replay VNode patches the element in place', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(
        () => h.div([], [h.span([h.OnUnmount(Message.Unmounted())])]),
        dispatch,
      ),
    )

    beginReplayRender()
    try {
      const replayed = patch(
        mounted,
        renderView(() => h.div([], [h.span([])]), Dispatch.of(noOpDispatch)),
      )
      patch(
        replayed,
        renderView(() => h.div([]), Dispatch.of(noOpDispatch)),
      )
      flushReplayUnmountsAfterPatchFailure()
    } finally {
      endReplayRender()
    }

    expect(dispatched).toStrictEqual([Message.Unmounted()])
  })

  it('keeps distinct unmounts from VNodes that share one callback', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(() => {
        const shared = h.span([h.OnUnmount(Message.Unmounted())])
        const root = h.div([], [shared, shared])
        if (root === null) {
          throw new Error('Expected a VNode')
        }
        return dedupeSharedVNodes(root)
      }, dispatch),
    )

    beginReplayRender()
    try {
      patch(
        mounted,
        renderView(() => h.div([]), Dispatch.of(noOpDispatch)),
      )
      flushReplayUnmountsAfterPatchFailure()
    } finally {
      endReplayRender()
    }

    expect(dispatched).toStrictEqual([Message.Unmounted(), Message.Unmounted()])
  })

  it('preserves distinct live callbacks when replay VNodes share data', () => {
    const h = __htmlBuilder<typeof Message.UnmountedNamed.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(
        () =>
          h.div(
            [],
            [
              h.span([h.OnUnmount(Message.UnmountedNamed({ name: 'first' }))]),
              h.span([h.OnUnmount(Message.UnmountedNamed({ name: 'second' }))]),
            ],
          ),
        dispatch,
      ),
    )

    beginReplayRender()
    try {
      const replayed = patch(
        mounted,
        renderView(() => {
          const shared = h.span([])
          const root = h.div([], [shared, shared])
          if (root === null) {
            throw new Error('Expected a VNode')
          }
          return dedupeSharedVNodes(root)
        }, Dispatch.of(noOpDispatch)),
      )
      patch(
        replayed,
        renderView(() => h.div([]), Dispatch.of(noOpDispatch)),
      )
      flushReplayUnmountsAfterPatchFailure()
    } finally {
      endReplayRender()
    }

    expect(dispatched).toStrictEqual([
      Message.UnmountedNamed({ name: 'first' }),
      Message.UnmountedNamed({ name: 'second' }),
    ])
  })

  it('dispatches again on a normal unmount after the replay window has closed', () => {
    const h = __htmlBuilder<typeof Message.Unmounted.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const withChild = () =>
      h.div([], [h.span([h.OnUnmount(Message.Unmounted())])])
    const withoutChild = () => h.div([])

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

    expect(dispatched).toStrictEqual([Message.Unmounted()])
  })

  it('composes with an OnMount destroy hook on the same element', async () => {
    const h = __htmlBuilder<
      typeof Message.Unmounted.Type | typeof Message.Mounted.Type
    >()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const action: MountAction<typeof Message.Mounted.Type> = {
      name: 'Mounted',
      f: () =>
        Stream.callback<typeof Message.Mounted.Type>(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                Queue.offerUnsafe(queue, Message.Mounted())
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
      h.div([], [h.span([h.OnMount(action), h.OnUnmount(Message.Unmounted())])])
    const withoutChild = () => h.div([])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toContainEqual(Message.Mounted())
    })

    patch(mounted, renderView(withoutChild, dispatch))

    expect(dispatched).toContainEqual(Message.Unmounted())
    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
  })

  it('composes regardless of attribute order with OnUnmount first', async () => {
    const h = __htmlBuilder<
      typeof Message.Unmounted.Type | typeof Message.Mounted.Type
    >()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const action: MountAction<typeof Message.Mounted.Type> = {
      name: 'Mounted',
      f: () =>
        Stream.callback<typeof Message.Mounted.Type>(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                Queue.offerUnsafe(queue, Message.Mounted())
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
      h.div([], [h.span([h.OnUnmount(Message.Unmounted()), h.OnMount(action)])])
    const withoutChild = () => h.div([])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toContainEqual(Message.Mounted())
    })

    patch(mounted, renderView(withoutChild, dispatch))

    expect(dispatched).toContainEqual(Message.Unmounted())
    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
  })
})

const DialogMessage = defineMessageUnion({ UnmountedDialog: {} })
const ParentMessage = defineMessageUnion({ UnmountedParent: {} })

type DialogViewInput = Readonly<{
  toView: (dialog: ReadonlyArray<ChildAttribute>) => VNode | null
}>

// A Block that publishes an OnUnmount attribute through its view input,
// mirroring how Ui.Dialog publishes `dialog` attributes carrying OnUnmount.
class Dialog extends Block<Dialog, void, DialogViewInput>()('Dialog', {
  Message: DialogMessage,
}) {}

const DialogLive = Dialog.make(
  Effect.fn(function* () {
    return {
      update: { UnmountedDialog: model => ({ model }) },
      view: (_model, h, { toView }) =>
        toView(
          childAttributes([
            h.Id('child-dialog'),
            h.OnUnmount(Dialog.Message.UnmountedDialog()),
          ]),
        ),
    }
  }),
)

// Renders with a persistent boundary registry shared across renders and a
// `beginRender` call each pass, matching how the runtime drives Block
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

describe('OnUnmount across a Block boundary', () => {
  it.effect('composes child and parent callbacks on the same element', () =>
    Effect.scoped(
      Effect.gen(function* () {
        let isDialogRendered = true

        class Parent extends Block<Parent>()('Parent', {
          Model: Schema.Struct({ dialog: Dialog }),
          Message: ParentMessage,
        }) {}

        const ParentLive = Parent.make(
          Effect.fn(function* () {
            const dialog = yield* new Dialog('dialog')
            return {
              model: { dialog },
              update: { UnmountedParent: model => ({ model }) },
              view: (model, h) =>
                isDialogRendered
                  ? h.div(
                      [],
                      [
                        model.dialog.view({
                          toView: dialogAttributes =>
                            h.dialog([
                              ...dialogAttributes,
                              h.OnUnmount(Parent.Message.UnmountedParent()),
                            ]),
                        }),
                      ],
                    )
                  : h.div([]),
            }
          }),
        ).pipe(Layer.provide(DialogLive))

        const context = yield* Layer.build(ParentLive)
        const block = runtimeBlockOf(Parent)
        const graph = makeGraph({ isSimulation: false })
        const instance = constructSync(
          graph,
          block,
          [],
          block.id,
          undefined,
          context,
        )
        reconcile(graph, instance)

        const { dispatch, dispatched } = createCapturingDispatch()
        const registry = createHtmlBoundaryRegistry()
        const render = () =>
          renderViewWithRegistry(
            /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
            () => renderRoot(graph, instance) as VNode | null,
            dispatch,
            registry,
          )

        const mounted = patch(toVNode(makeRootContainer()), render())
        isDialogRendered = false
        patch(mounted, render())

        expect(dispatched).toStrictEqual([
          deliver(Dialog, 'dialog', Dialog.Message.UnmountedDialog()),
          Parent.Message.UnmountedParent(),
        ])
      }),
    ),
  )
})
