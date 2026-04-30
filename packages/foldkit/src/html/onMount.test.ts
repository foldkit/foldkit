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

import { m } from '../message/index.js'
import { propsModule } from '../propsModule.js'
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
    const { div, span, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = div(
      [],
      [
        span(
          [
            OnMount(() =>
              Effect.succeed({ message: MountedRoot(), cleanup: () => {} }),
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

  it('passes the inserted Element into the Effect factory', async () => {
    const { div, span, Id, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const seenIds: Array<string> = []

    const view = div(
      [],
      [
        span(
          [
            Id('mounted'),
            OnMount(element => {
              seenIds.push(element.id)
              return Effect.succeed({
                message: MountedRoot(),
                cleanup: () => {},
              })
            }),
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
    const { div, span, Key, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const buildView = (key: string) =>
      div(
        [],
        [
          span(
            [
              Key(key),
              OnMount(() =>
                Effect.succeed({
                  message: MountedRoot(),
                  cleanup: () => {
                    cleanupCalls += 1
                  },
                }),
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
    const { div, span, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const withChild = div(
      [],
      [
        span(
          [
            OnMount(() =>
              Effect.succeed({
                message: MountedRoot(),
                cleanup: () => {
                  cleanupCalls += 1
                },
              }),
            ),
          ],
          [],
        ),
      ],
    )
    const withoutChild = div([], [])

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

  it('runs the cleanup exactly once even if the destroy hook is invoked twice', async () => {
    const { div, span, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    const withChild = div(
      [],
      [
        span(
          [
            OnMount(() =>
              Effect.succeed({
                message: MountedRoot(),
                cleanup: () => {
                  cleanupCalls += 1
                },
              }),
            ),
          ],
          [],
        ),
      ],
    )
    const withoutChild = div([], [])

    const mounted = patch(
      toVNode(makeRootContainer()),
      renderView(withChild, dispatch),
    )

    await vi.waitFor(() => {
      expect(dispatched).toHaveLength(1)
    })

    patch(mounted, renderView(withoutChild, dispatch))
    patch(
      renderView(withoutChild, dispatch),
      renderView(withoutChild, dispatch),
    )

    expect(cleanupCalls).toBe(1)
  })

  it('logs a failing Effect and dispatches nothing', async () => {
    const { div, span, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = div(
      [],
      [span([OnMount(() => Effect.fail(new Error('boom')))], [])],
    )
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        '[OnMount] unhandled failure',
        expect.anything(),
      )
    })
    expect(dispatched).toStrictEqual([])
  })

  it('runs cleanup immediately if the Effect resolves after the element is destroyed', async () => {
    const { div, span, OnMount } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let cleanupCalls = 0

    let resolveMount: (value: void) => void = () => {}
    const mountGate = new Promise<void>(resolve => {
      resolveMount = resolve
    })

    const withChild = div(
      [],
      [
        span(
          [
            OnMount(() =>
              Effect.tryPromise(() => mountGate).pipe(
                Effect.map(() => ({
                  message: MountedRoot(),
                  cleanup: () => {
                    cleanupCalls += 1
                  },
                })),
              ),
            ),
          ],
          [],
        ),
      ],
    )
    const withoutChild = div([], [])

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
})
