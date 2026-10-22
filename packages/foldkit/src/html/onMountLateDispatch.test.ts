import { Context, Effect, Fiber, Queue, Stream } from 'effect'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { type MountAction, MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/dispatch.js'
import { init, toVNode } from '../snabbdom/index.js'
import type { VNode } from '../vdom.js'
import {
  __beginRender,
  __clearRuntime,
  __createBoundaryRegistry,
  __htmlBuilder,
  __setRuntime,
  defineView,
} from './index.js'

const interruptions = vi.hoisted(() => ({
  isDelayed: true,
  pending: new globalThis.Array<Fiber.Fiber<unknown, unknown>>(),
}))

// NOTE: Hold destroy-triggered interruption until cleanup so the Stream can
// emit after lifecycle release, independently of cancellation scheduling.
vi.mock('effect', async importOriginal => {
  const actual = await importOriginal<typeof import('effect')>()
  return {
    ...actual,
    Fiber: {
      ...actual.Fiber,
      interrupt: (fiber: Fiber.Fiber<unknown, unknown>) =>
        interruptions.isDelayed
          ? actual.Effect.sync(() => {
              interruptions.pending.push(fiber)
            })
          : actual.Fiber.interrupt(fiber),
    },
  }
})

const cleanups: Array<() => void> = []

beforeEach(() => {
  interruptions.isDelayed = true
  interruptions.pending.length = 0
})

afterEach(async () => {
  try {
    for (const cleanup of cleanups.splice(0)) {
      cleanup()
    }

    interruptions.isDelayed = false
    for (const fiber of interruptions.pending.splice(0)) {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  } finally {
    vi.restoreAllMocks()
  }
})

const Message = defineMessageUnion({ CompletedProbe: {} })
type Message = typeof Message.Type

it.each([
  {
    name: 'drops a root Mount emission after destroy while interruption is pending',
    isInsideBoundary: false,
  },
  {
    name: 'drops a Mount emission after its Submodel boundary is removed while interruption is pending',
    isInsideBoundary: true,
  },
])('$name', async ({ isInsideBoundary }) => {
  const emitted: Array<Message> = []
  const dispatched: Array<unknown> = []
  const lifecycle: Array<string> = []
  const finalized = vi.fn()
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  const dispatch = Dispatch.of({
    dispatchAsync: () => Effect.void,
    dispatchSync: message => {
      dispatched.push(message)
    },
  })
  const context = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {
        lifecycle.push('started')
      },
      ended: () => {
        lifecycle.push('ended')
      },
    }),
  )
  const queue = await Effect.runPromise(Queue.unbounded<Message>())
  const registry = __createBoundaryRegistry()
  const h = __htmlBuilder<Message>()
  const patch = init([])
  const render = (view: () => VNode | null): VNode => {
    __beginRender(registry)
    __setRuntime(dispatch.dispatchSync, context, registry)
    try {
      const vnode = view()

      if (vnode === null) {
        throw new Error('render received a null VNode')
      }

      return vnode
    } finally {
      __clearRuntime()
    }
  }
  const probe: MountAction<Message> = {
    name: 'Probe',
    f: () =>
      Stream.fromQueue(queue).pipe(
        Stream.map(message => {
          emitted.push(message)
          return message
        }),
        Stream.ensuring(Effect.sync(finalized)),
      ),
  }
  const childView = defineView<object, Message>((_model, childHtml) =>
    childHtml.span([childHtml.OnMount(probe)]),
  )
  const withChild = () =>
    h.div(
      [],
      [
        isInsideBoundary
          ? h.submodel({
              slotId: 'probe',
              model: {},
              view: childView,
              toParentMessage: message => message,
            })
          : h.span([h.OnMount(probe)]),
      ],
    )
  let mounted = patch(toVNode(document.createElement('div')), render(withChild))
  const destroy = () => {
    mounted = patch(
      mounted,
      render(() => h.div([])),
    )
  }
  cleanups.push(destroy)

  Queue.offerUnsafe(queue, Message.CompletedProbe())
  await vi.waitFor(() => {
    expect(dispatched).toStrictEqual([Message.CompletedProbe()])
  })

  destroy()

  expect(registry.wraps.has('probe')).toBe(false)
  expect(lifecycle).toStrictEqual(['started', 'ended'])
  expect(interruptions.pending).toHaveLength(1)
  expect(finalized).not.toHaveBeenCalled()

  Queue.offerUnsafe(queue, Message.CompletedProbe())
  await vi.waitFor(() => {
    expect(emitted).toStrictEqual([
      Message.CompletedProbe(),
      Message.CompletedProbe(),
    ])
  })

  expect(dispatched).toStrictEqual([Message.CompletedProbe()])
  expect(errors).not.toHaveBeenCalled()
  expect(lifecycle).toStrictEqual(['started', 'ended'])

  interruptions.isDelayed = false
  for (const fiber of interruptions.pending.splice(0)) {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }

  expect(finalized).toHaveBeenCalledOnce()
  expect(lifecycle).toStrictEqual(['started', 'ended'])
})
