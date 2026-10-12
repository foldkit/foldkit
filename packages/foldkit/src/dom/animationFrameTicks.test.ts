import { Array, Effect, Fiber, Stream } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

const START_TIME = 100
const FIRST_FRAME_TIME = 116
const SECOND_FRAME_TIME = 132
const FIRST_FRAME_ID = 1
const SECOND_FRAME_ID = 2

const loadAnimationFrameTicks = async () =>
  (await import('./animationFrameTicks.js')).animationFrameTicks

const stubAnimationFrames = () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  const state = { nextFrameId: FIRST_FRAME_ID }
  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    const frameId = state.nextFrameId++
    callbacks.set(frameId, callback)
    return frameId
  })
  const cancelFrame = vi.fn((frameId: number) => {
    callbacks.delete(frameId)
  })
  const currentTime = vi.spyOn(performance, 'now').mockReturnValue(START_TIME)

  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelFrame)

  const frame = (frameId: number, time: number): void => {
    const callback = callbacks.get(frameId)
    if (callback === undefined) {
      throw new Error(`No pending frame ${frameId}`)
    }

    callbacks.delete(frameId)
    callback(time)
  }

  return { callbacks, requestFrame, cancelFrame, currentTime, frame }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('animationFrameTicks', () => {
  it('does not start an animation loop until the Stream starts', async () => {
    const harness = stubAnimationFrames()
    vi.resetModules()

    const animationFrameTicks = await loadAnimationFrameTicks()

    expect(Stream.isStream(animationFrameTicks)).toBe(true)
    expect(harness.requestFrame).not.toHaveBeenCalled()
  })

  it('gives concurrent subscribers independent elapsed times and cleanup', async () => {
    const harness = stubAnimationFrames()
    const animationFrameTicks = await loadAnimationFrameTicks()
    const first = Effect.runFork(
      Stream.runCollect(Stream.take(animationFrameTicks, 1)),
    )
    const second = Effect.runFork(
      Stream.runCollect(Stream.take(animationFrameTicks, 1)),
    )

    try {
      await vi.waitFor(() => expect(harness.callbacks.size).toBe(2))

      harness.frame(FIRST_FRAME_ID, FIRST_FRAME_TIME)
      harness.frame(SECOND_FRAME_ID, SECOND_FRAME_TIME)

      const firstResult = await Effect.runPromise(Fiber.join(first))
      const secondResult = await Effect.runPromise(Fiber.join(second))

      expect(Array.fromIterable(firstResult)).toEqual([
        FIRST_FRAME_TIME - START_TIME,
      ])
      expect(Array.fromIterable(secondResult)).toEqual([
        SECOND_FRAME_TIME - START_TIME,
      ])
      expect(harness.cancelFrame).toHaveBeenCalledTimes(2)
      expect(harness.callbacks.size).toBe(0)
    } finally {
      await Effect.runPromise(Fiber.interrupt(first))
      await Effect.runPromise(Fiber.interrupt(second))
    }
  })

  it('cancels the pending frame on interruption without stopping another subscriber', async () => {
    const harness = stubAnimationFrames()
    const animationFrameTicks = await loadAnimationFrameTicks()
    const received: Array<number> = []
    const first = Effect.runFork(
      Stream.runForEach(animationFrameTicks, elapsed =>
        Effect.sync(() => {
          received.push(elapsed)
        }),
      ),
    )
    const second = Effect.runFork(Stream.runDrain(animationFrameTicks))

    try {
      await vi.waitFor(() => expect(harness.callbacks.size).toBe(2))

      harness.frame(FIRST_FRAME_ID, FIRST_FRAME_TIME)
      await vi.waitFor(() =>
        expect(received).toEqual([FIRST_FRAME_TIME - START_TIME]),
      )

      await Effect.runPromise(Fiber.interrupt(first))

      expect(harness.callbacks.size).toBe(1)
      expect(harness.callbacks.has(SECOND_FRAME_ID)).toBe(true)
      expect(harness.cancelFrame).toHaveBeenCalledTimes(1)

      await Effect.runPromise(Fiber.interrupt(second))

      expect(harness.callbacks.size).toBe(0)
      expect(harness.cancelFrame).toHaveBeenCalledTimes(2)
    } finally {
      await Effect.runPromise(Fiber.interrupt(first))
      await Effect.runPromise(Fiber.interrupt(second))
    }
  })
})
