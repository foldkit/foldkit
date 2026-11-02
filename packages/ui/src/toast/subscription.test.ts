import { Effect, Fiber, Option, Stream } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Message, SwipeState } from './schema.js'
import {
  swipeDependencies,
  swipeEscapeMessages,
  swipePointerMessages,
} from './update.js'

const POINTER_ID = 1
const OTHER_POINTER_ID = 2

const makeDraggingEntry = (pointerId: number, startX: number) => ({
  swipeState: SwipeState.Dragging({ pointerId, startX, currentX: startX }),
})

const withDraggingEntries = (
  entries: ReadonlyArray<ReturnType<typeof makeDraggingEntry>>,
) => ({
  maybeSwipeConfig: Option.some({ threshold: 40, direction: 'Right' }),
  entries,
})

const waitForNextTurn = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

describe('Toast Subscriptions', () => {
  it('emits PressedEscape only for the Escape key', async () => {
    const model = withDraggingEntries([
      makeDraggingEntry(POINTER_ID, 100),
      makeDraggingEntry(OTHER_POINTER_ID, 200),
    ])
    const stream = swipeEscapeMessages(swipeDependencies(model))
    const received: Array<typeof Message.PressedEscape.Type> = []
    const fiber = Effect.runFork(
      Stream.runForEach(stream, message =>
        Effect.sync(() => {
          received.push(message)
        }),
      ),
    )

    try {
      await waitForNextTurn()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      await waitForNextTurn()

      expect(received).toEqual([])

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await waitForNextTurn()

      expect(received).toEqual([Message.PressedEscape()])
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }
  })

  it('leaves existing document selection styles intact while dragging', async () => {
    const documentElement = document.documentElement
    const previousStyle = documentElement.getAttribute('style')
    const previousStyleCount = document.head.querySelectorAll('style').length
    const existingStyle = 'user-select: text; -webkit-user-select: text'
    documentElement.setAttribute('style', existingStyle)

    const model = withDraggingEntries([makeDraggingEntry(POINTER_ID, 100)])
    const dependencies = swipeDependencies(model)
    expect(dependencies.isAnyDragging).toBe(true)
    const stream = swipePointerMessages(dependencies)
    const fiber = Effect.runFork(Stream.runDrain(stream))

    try {
      await vi.waitFor(() => {
        expect(document.head.querySelectorAll('style')).toHaveLength(
          previousStyleCount + 1,
        )
      })

      expect(documentElement.getAttribute('style')).toBe(existingStyle)

      await Effect.runPromise(Fiber.interrupt(fiber))

      expect(documentElement.getAttribute('style')).toBe(existingStyle)
      expect(document.head.querySelectorAll('style')).toHaveLength(
        previousStyleCount,
      )
    } finally {
      await Effect.runPromise(Fiber.interrupt(fiber))
      if (previousStyle === null) {
        documentElement.removeAttribute('style')
      } else {
        documentElement.setAttribute('style', previousStyle)
      }
    }
  })
})
