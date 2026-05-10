import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
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

import type { MountResult } from '../html/index.js'
import { m } from '../message/index.js'
import type { MountAction } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { noOpDispatch } from '../runtime/crashUI.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import { html } from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const MountedRoot = m('MountedRoot')

/** Test fixture that constructs a Mounted MountAction directly with a custom
 *  factory. Each test wires up its own factory body, so the production
 *  `Mount.define(...)(factory)` shape (which binds a single factory at
 *  definition time) doesn't fit. The runtime only reads `name`, `args`,
 *  and `f` from a MountAction. */
const makeMounted = (
  f: (element: Element) => Effect.Effect<MountResult<typeof MountedRoot.Type>>,
): MountAction<typeof MountedRoot.Type> => ({ name: 'Mounted', f })

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
  view: Effect.Effect<VNode | null, never, Dispatch>,
  dispatch: Dispatch['Type'],
): VNode => {
  const maybeVNode = Effect.runSync(
    Effect.provideService(view, Dispatch, dispatch),
  )
  if (maybeVNode === null) {
    throw new Error('renderView received a null VNode')
  }
  return maybeVNode
}

const makeRootContainer = (): HTMLElement => document.createElement('div')

describe('OnMount', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dispatches the returned Message when the element mounts', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = h.div(
      [],
      [
        h.span(
          [
            h.OnMount(
              makeMounted(() =>
                Effect.succeed({ message: MountedRoot(), cleanup: () => {} }),
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
      expect(dispatched).toStrictEqual([MountedRoot()])
    })
  })

  it('does not dispatch the result Message when rendered with a no-op dispatch', async () => {
    const h = html<typeof MountedRoot.Type>()
    let effectRan = false

    const view = h.div(
      [],
      [
        h.span(
          [
            h.OnMount(
              makeMounted(() => {
                effectRan = true
                return Effect.succeed({
                  message: MountedRoot(),
                  cleanup: () => {},
                })
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
      expect(effectRan).toBe(true)
    })
  })

  it('passes the inserted Element into the Effect factory', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const seenIds: Array<string> = []

    const view = h.div(
      [],
      [
        h.span(
          [
            h.Id('mounted'),
            h.OnMount(
              makeMounted(element => {
                seenIds.push(element.id)
                return Effect.succeed({
                  message: MountedRoot(),
                  cleanup: () => {},
                })
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

  it('runs the cleanup when the element is removed by a key change', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const buildView = (key: string) =>
      h.div(
        [],
        [
          h.span(
            [
              h.Key(key),
              h.OnMount(
                makeMounted(() =>
                  Effect.succeed({
                    message: MountedRoot(),
                    cleanup: () => {
                      cleanupCalls += 1
                    },
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

    expect(cleanupCalls).toBe(1)
  })

  it('runs the cleanup when the element is removed by a parent re-render', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const withChild = h.div(
      [],
      [
        h.span(
          [
            h.OnMount(
              makeMounted(() =>
                Effect.succeed({
                  message: MountedRoot(),
                  cleanup: () => {
                    cleanupCalls += 1
                  },
                }),
              ),
            ),
          ],
          [],
        ),
      ],
    )
    const withoutChild = h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })

    patch(mounted, renderView(withoutChild, dispatch))

    expect(cleanupCalls).toBe(1)
  })

  it('logs a failing Effect and dispatches nothing', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = h.div(
      [],
      [
        h.span(
          [h.OnMount(makeMounted(() => Effect.fail(new Error('boom'))))],
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

  it('runs cleanup immediately if the Effect resolves after the element is destroyed', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    let resolveMount: (value: void) => void = () => {}
    const mountGate = new Promise<void>(resolve => {
      resolveMount = resolve
    })

    const withChild = h.div(
      [],
      [
        h.span(
          [
            h.OnMount(
              makeMounted(() =>
                Effect.tryPromise(() => mountGate).pipe(
                  Effect.map(() => ({
                    message: MountedRoot(),
                    cleanup: () => {
                      cleanupCalls += 1
                    },
                  })),
                ),
              ),
            ),
          ],
          [],
        ),
      ],
    )
    const withoutChild = h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )
    patch(mounted, renderView(withoutChild, dispatch))

    resolveMount()

    await vi.waitFor(() => {
      expect(cleanupCalls).toBe(1)
    })
    expect(dispatched).toStrictEqual([])
  })

  it('runs exactly once across repeated patches of the same element', async () => {
    const h = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let mountRunCount = 0
    let cleanupRunCount = 0

    const buildView = () =>
      h.div(
        [],
        [
          h.span(
            [
              h.OnMount(
                makeMounted(() => {
                  mountRunCount += 1
                  return Effect.succeed({
                    message: MountedRoot(),
                    cleanup: () => {
                      cleanupRunCount += 1
                    },
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
      expect(mountRunCount).toBe(1)
    })
    expect(dispatched).toStrictEqual([MountedRoot()])
    expect(cleanupRunCount).toBe(0)
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
                  Effect.succeed({
                    message: MountedRoot(),
                    cleanup: () => {
                      cleanupRunCount += 1
                    },
                  }),
                ),
              ),
            ],
            [],
          ),
        ],
      )
    const withoutChild = h.div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild(), dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })

    const afterSecond = patch(mounted, renderView(withChild(), dispatch))
    const afterThird = patch(afterSecond, renderView(withChild(), dispatch))

    patch(afterThird, renderView(withoutChild, dispatch))

    expect(cleanupRunCount).toBe(1)
  })
})
