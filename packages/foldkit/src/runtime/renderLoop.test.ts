import {
  Duration,
  Effect,
  Exit,
  Fiber,
  Queue,
  Ref,
  SubscriptionRef,
} from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { makeRenderLoop } from './renderLoop.js'

const NO_RENDER_WINDOW = Duration.millis(50)

type Harness = Readonly<{
  pendingRef: SubscriptionRef.SubscriptionRef<boolean>
  pausedRef: Ref.Ref<boolean>
  awaitRender: () => Promise<void>
  expectNoRender: () => Promise<void>
  setPending: (value: boolean) => Promise<void>
  setPaused: (value: boolean) => Promise<void>
  cleanup: () => Promise<void>
}>

const setupLoop = async (initialPaused: boolean = false): Promise<Harness> => {
  const pendingRef = await Effect.runPromise(SubscriptionRef.make(false))
  const pausedRef = await Effect.runPromise(Ref.make(initialPaused))
  const renderEvents = await Effect.runPromise(Queue.unbounded<void>())

  const loop = makeRenderLoop({
    pendingRef,
    awaitNextFrame: Effect.void,
    isPaused: Ref.get(pausedRef),
    render: Queue.offer(renderEvents, undefined).pipe(Effect.asVoid),
  })

  const fiber = Effect.runFork(loop)

  return {
    pendingRef,
    pausedRef,
    awaitRender: () =>
      Effect.runPromise(Queue.take(renderEvents).pipe(Effect.asVoid)),
    expectNoRender: async () => {
      const result = await Effect.runPromise(
        Queue.take(renderEvents).pipe(
          Effect.timeout(NO_RENDER_WINDOW),
          Effect.exit,
        ),
      )
      if (Exit.isSuccess(result)) {
        throw new Error('expected no render but one fired')
      }
    },
    setPending: value =>
      Effect.runPromise(SubscriptionRef.set(pendingRef, value)),
    setPaused: value => Effect.runPromise(Ref.set(pausedRef, value)),
    cleanup: () => Effect.runPromise(Fiber.interrupt(fiber)),
  }
}

describe('makeRenderLoop', () => {
  let harness: Harness | null = null

  afterEach(async () => {
    if (harness !== null) {
      await harness.cleanup()
      harness = null
    }
  })

  it('does not render while idle', async () => {
    harness = await setupLoop()

    await harness.expectNoRender()
  })

  it('renders on a false-to-true transition of the pending bit', async () => {
    harness = await setupLoop()

    await harness.setPending(true)

    await harness.awaitRender()
  })

  it('clears the pending bit after rendering', async () => {
    harness = await setupLoop()

    await harness.setPending(true)
    await harness.awaitRender()

    const value = await Effect.runPromise(
      SubscriptionRef.get(harness.pendingRef),
    )
    expect(value).toBe(false)
  })

  it('coalesces a burst of redundant true sets into a single render', async () => {
    harness = await setupLoop()

    await harness.setPending(true)
    await harness.setPending(true)
    await harness.setPending(true)

    await harness.awaitRender()
    await harness.expectNoRender()
  })

  it('renders again after a second false-to-true transition', async () => {
    harness = await setupLoop()

    await harness.setPending(true)
    await harness.awaitRender()

    await harness.setPending(true)
    await harness.awaitRender()
  })

  it('does not render while paused', async () => {
    harness = await setupLoop(true)

    await harness.setPending(true)

    await harness.expectNoRender()
  })

  it('clears the pending bit when a paused tick aborts so the loop self-recovers', async () => {
    harness = await setupLoop(true)

    await harness.setPending(true)
    await harness.expectNoRender()

    const valueAfterPausedTick = await Effect.runPromise(
      SubscriptionRef.get(harness.pendingRef),
    )
    expect(valueAfterPausedTick).toBe(false)
  })

  it('renders the next dispatch after pause flips false without going through a synchronous render', async () => {
    harness = await setupLoop(true)

    // Dispatch while paused: the loop wakes, clears the bit, and aborts.
    await harness.setPending(true)
    await harness.expectNoRender()

    // External paths in the DevTools store flip isPaused to false without
    // going through bridge.render (eviction past pausedAtIndex, clear).
    await harness.setPaused(false)

    // The next dispatch must wake the loop and render.
    await harness.setPending(true)
    await harness.awaitRender()
  })
})
