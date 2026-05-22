import { describe, it } from '@effect/vitest'
import { Context, Effect, Function, Queue, Stream } from 'effect'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { m } from '../message/index.js'
import * as Mount from '../mount/index.js'
import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { noOpDispatch } from '../runtime/crashUI.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import {
  __clearRuntime as clearHtmlRuntime,
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

const MountedRoot = m('MountedRoot')

const WAIT_FOR_INTERRUPT_PROPAGATION_MS = 50

/** Test fixture that constructs a Mounted MountAction directly with a custom
 *  Stream factory. Each test wires up its own factory body, so the production
 *  `Mount.define(...)(factory)` shape (which binds a single factory at
 *  definition time) doesn't fit. The runtime only reads `name`, `args`,
 *  and `f` from a MountAction. */
const makeMounted = (
  f: (element: Element) => Stream.Stream<typeof MountedRoot.Type>,
): MountAction<typeof MountedRoot.Type> => ({ name: 'Mounted', f })

/** Helper that builds the canonical one-shot-with-cleanup Stream for a Mount
 *  using `Stream.callback` + `Effect.acquireRelease`. Emits the Message once,
 *  registers the cleanup, and keeps the stream's scope open until interrupted. */
const oneShotStream = (
  cleanup: () => void = () => {},
): Stream.Stream<typeof MountedRoot.Type> =>
  Stream.callback<typeof MountedRoot.Type>(queue =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          Queue.offerUnsafe(queue, MountedRoot())
        }),
        () => Effect.sync(cleanup),
      )
      return yield* Effect.never
    }),
  )

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
  dispatch: Dispatch['Type'],
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

describe('OnMount', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dispatches the emitted Message when the element mounts', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.div([], [h.span([h.OnMount(makeMounted(() => oneShotStream()))], [])])
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([MountedRoot()])
    })
  })

  it('does not dispatch the emitted Message when rendered with a no-op dispatch', async () => {
    const h = html<typeof MountedRoot.Type>()
    let streamRan = false

    const view = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() => {
                  streamRan = true
                  return oneShotStream()
                }),
              ),
            ],
            [],
          ),
        ],
      )
    const vnode = renderView(view, Dispatch.of(noOpDispatch))

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(streamRan).toBe(true)
    })
  })

  it('passes the inserted Element into the Stream factory', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const seenIds: Array<string> = []

    const view = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.Id('mounted'),
              h.OnMount(
                makeMounted(element => {
                  seenIds.push(element.id)
                  return oneShotStream()
                }),
              ),
            ],
            [],
          ),
        ],
      )
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([MountedRoot()])
    })
    expect(seenIds).toStrictEqual(['mounted'])
  })

  it('dispatches every Message a streaming Stream emits over the element lifetime', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() =>
                  Stream.fromIterable([
                    MountedRoot(),
                    MountedRoot(),
                    MountedRoot(),
                  ]),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([
        MountedRoot(),
        MountedRoot(),
        MountedRoot(),
      ])
    })
  })

  it('dispatches async events from a listener attached inside acquireRelease and detaches on destroy', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let listenerAttached = false
    let listenerDetached = false
    let externalEmit: () => void = Function.constVoid

    const withChild = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() =>
                  Stream.callback<typeof MountedRoot.Type>(queue =>
                    Effect.gen(function* () {
                      yield* Effect.acquireRelease(
                        Effect.sync(() => {
                          listenerAttached = true
                          externalEmit = () =>
                            Queue.offerUnsafe(queue, MountedRoot())
                        }),
                        () =>
                          Effect.sync(() => {
                            listenerDetached = true
                            externalEmit = Function.constVoid
                          }),
                      )
                      return yield* Effect.never
                    }),
                  ),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(listenerAttached).toBe(true)
    })

    externalEmit()
    externalEmit()
    externalEmit()

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(3)
    })

    patch(mounted, renderView(withoutChild, dispatch))

    await vi.waitFor(() => {
      expect(listenerDetached).toBe(true)
    })

    externalEmit()
    await new Promise(resolve =>
      setTimeout(resolve, WAIT_FOR_INTERRUPT_PROPAGATION_MS),
    )
    expect(dispatched).toHaveLength(3)
  })

  it('runs the cleanup when the element is removed by a key change', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const buildView = (key: string) => () =>
      h.div(
        [],
        [
          h.span(
            [
              h.Key(key),
              h.OnMount(
                makeMounted(() =>
                  oneShotStream(() => {
                    cleanupCalls += 1
                  }),
                ),
              ),
            ],
            [],
          ),
        ],
      )

    const firstVNode = renderView(buildView('a'), dispatch)
    const mounted = patch(toVNode(makeRootContainer()), firstVNode)

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })
    expect(cleanupCalls).toBe(0)

    const secondVNode = renderView(buildView('b'), dispatch)
    patch(mounted, secondVNode)

    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
  })

  it('runs the cleanup when the element is removed by a parent re-render', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const withChild = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() =>
                  oneShotStream(() => {
                    cleanupCalls += 1
                  }),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })

    patch(mounted, renderView(withoutChild, dispatch))

    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
  })

  it('logs a failing Stream and dispatches nothing', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() =>
                  Stream.fromEffect(Effect.fail(new Error('boom'))),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        '[OnMount Mounted] unhandled failure',
        expect.anything(),
      )
    })
    expect(dispatched).toStrictEqual([])
  })

  it('runs exactly once across repeated patches of the same element', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let streamRunCount = 0
    let cleanupRunCount = 0

    const buildView = () => () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() => {
                  streamRunCount += 1
                  return oneShotStream(() => {
                    cleanupRunCount += 1
                  })
                }),
              ),
            ],
            [],
          ),
        ],
      )

    const firstVNode = renderView(buildView(), dispatch)
    const mounted = patch(toVNode(makeRootContainer()), firstVNode)

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })

    const secondVNode = renderView(buildView(), dispatch)
    const afterSecond = patch(mounted, secondVNode)

    const thirdVNode = renderView(buildView(), dispatch)
    patch(afterSecond, thirdVNode)

    await vi.waitFor(() => {
      expect(streamRunCount).toBe(1)
    })
    expect(dispatched).toStrictEqual([MountedRoot()])
    expect(cleanupRunCount).toBe(0)
  })

  it('skips release and dispatches nothing when destroy interrupts an in-flight acquire', async () => {
    // NOTE: Locks in the v4-beta Effect.acquireRelease contract: if acquire
    // is interrupted before completing, release is NOT called (no resource
    // was acquired, so nothing to release). This is the correct semantic
    // for async Mount setup. For example, a Mount that dynamically imports
    // a library before constructing a handle: if the element unmounts
    // during the import, there is no handle to destroy.
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0
    let acquireCompleted = false

    let resolveAcquire: (value: void) => void = Function.constVoid
    const acquireGate = new Promise<void>(resolve => {
      resolveAcquire = resolve
    })

    const withChild = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() =>
                  Stream.callback<typeof MountedRoot.Type>(queue =>
                    Effect.gen(function* () {
                      yield* Effect.acquireRelease(
                        Effect.tryPromise(() => acquireGate).pipe(
                          Effect.map(() => {
                            acquireCompleted = true
                            Queue.offerUnsafe(queue, MountedRoot())
                          }),
                        ),
                        () =>
                          Effect.sync(() => {
                            cleanupCalls += 1
                          }),
                      )
                      return yield* Effect.never
                    }),
                  ),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )
    patch(mounted, renderView(withoutChild, dispatch))

    resolveAcquire()

    await new Promise(resolve =>
      setTimeout(resolve, WAIT_FOR_INTERRUPT_PROPAGATION_MS),
    )

    expect(acquireCompleted).toBe(false)
    expect(cleanupCalls).toBe(0)
    expect(dispatched).toStrictEqual([])
  })

  it('Mount.define wraps an Effect: dispatches the result Message and holds the scope open until destroy for acquireRelease finalizers', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let acquired = false
    let released = false

    const WrappedEffect = Mount.define(
      'WrappedEffect',
      MountedRoot,
    )(() =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            acquired = true
          }),
          () =>
            Effect.sync(() => {
              released = true
            }),
        )
        return MountedRoot()
      }),
    )

    const withChild = () =>
      h.div([], [h.span([h.OnMount(WrappedEffect())], [])])
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([MountedRoot()])
    })
    expect(acquired).toBe(true)
    expect(released).toBe(false)

    patch(mounted, renderView(withoutChild, dispatch))

    await vi.waitFor(() => {
      expect(released).toBe(true)
    })
  })

  it('runs cleanup on unmount even after multiple re-renders', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupRunCount = 0

    const withChild = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() =>
                  oneShotStream(() => {
                    cleanupRunCount += 1
                  }),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const withoutChild = () => h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })

    const afterSecond = patch(mounted, renderView(withChild, dispatch))
    const afterThird = patch(afterSecond, renderView(withChild, dispatch))

    patch(afterThird, renderView(withoutChild, dispatch))

    await vi.waitFor(() => {
      expect(cleanupRunCount).toBe(1)
    })
  })
})
