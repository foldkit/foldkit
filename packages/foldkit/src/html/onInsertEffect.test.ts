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

describe('OnInsertEffect', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('dispatches the returned Message to the runtime when the element mounts', async () => {
    const { div, span, OnInsertEffect } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const view = div(
      [],
      [span([OnInsertEffect(() => Effect.succeed(MountedRoot()))], [])],
    )
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([MountedRoot()])
    })
  })

  it('passes the inserted Element into the Effect factory', async () => {
    const { div, span, Id, OnInsertEffect } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const seenIds: Array<string> = []

    const view = div(
      [],
      [
        span(
          [
            Id('mounted'),
            OnInsertEffect(element => {
              seenIds.push(element.id)
              return Effect.succeed(MountedRoot())
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

  it('contains a failing Effect: logs to console.error and dispatches nothing', async () => {
    const { div, span, OnInsertEffect } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const error = new Error('boom')

    const view = div([], [span([OnInsertEffect(() => Effect.fail(error))], [])])
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        '[OnInsertEffect] unhandled failure',
        expect.anything(),
      )
    })
    expect(dispatched).toStrictEqual([])
  })

  it('a failed Effect does not suppress dispatch from a later insert', async () => {
    const { div, span, OnInsertEffect } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()

    const failingView = div(
      [],
      [span([OnInsertEffect(() => Effect.fail(new Error('boom')))], [])],
    )
    patch(toVNode(makeRootContainer()), renderView(failingView, dispatch))

    await vi.waitFor(() => {
      expect(console.error).toHaveBeenCalled()
    })
    expect(dispatched).toStrictEqual([])

    const succeedingView = div(
      [],
      [span([OnInsertEffect(() => Effect.succeed(MountedRoot()))], [])],
    )
    patch(toVNode(makeRootContainer()), renderView(succeedingView, dispatch))

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([MountedRoot()])
    })
  })

  it('runs exactly once across repeated patches of the same element', async () => {
    const { div, span, OnInsertEffect } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let effectRunCount = 0

    const buildView = () =>
      div(
        [],
        [
          span(
            [
              OnInsertEffect(() => {
                effectRunCount += 1
                return Effect.succeed(MountedRoot())
              }),
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
      expect(effectRunCount).toBe(1)
    })
    expect(dispatched).toStrictEqual([MountedRoot()])
  })

  it('fires again for a new element when the old one is replaced by a different key', async () => {
    const { div, span, Key, OnInsertEffect } = html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let effectRunCount = 0

    const buildView = (key: string) =>
      div(
        [],
        [
          span(
            [
              Key(key),
              OnInsertEffect(() => {
                effectRunCount += 1
                return Effect.succeed(MountedRoot())
              }),
            ],
            [],
          ),
        ],
      )

    const firstVNode = renderView(buildView('a'), dispatch)
    const mounted = patch(toVNode(makeRootContainer()), firstVNode)

    await vi.waitFor(() => {
      expect(effectRunCount).toBe(1)
    })

    const secondVNode = renderView(buildView('b'), dispatch)
    patch(mounted, secondVNode)

    await vi.waitFor(() => {
      expect(effectRunCount).toBe(2)
    })
    expect(dispatched).toStrictEqual([MountedRoot(), MountedRoot()])
  })

  it('OnInsertEffect overrides OnInsert when OnInsertEffect comes later in the attribute list', async () => {
    const { div, span, OnInsert, OnInsertEffect } =
      html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let onInsertCalls = 0

    const view = div(
      [],
      [
        span(
          [
            OnInsert(() => {
              onInsertCalls += 1
            }),
            OnInsertEffect(() => Effect.succeed(MountedRoot())),
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
    expect(onInsertCalls).toBe(0)
  })

  it('OnInsert overrides OnInsertEffect when OnInsert comes later in the attribute list', async () => {
    const { div, span, OnInsert, OnInsertEffect } =
      html<typeof MountedRoot.Type>()
    const { dispatch, dispatched } = createCapturingDispatch()
    let onInsertCalls = 0

    const view = div(
      [],
      [
        span(
          [
            OnInsertEffect(() => Effect.succeed(MountedRoot())),
            OnInsert(() => {
              onInsertCalls += 1
            }),
          ],
          [],
        ),
      ],
    )
    const vnode = renderView(view, dispatch)

    patch(toVNode(makeRootContainer()), vnode)

    expect(onInsertCalls).toBe(1)
    expect(dispatched).toStrictEqual([])
  })
})
