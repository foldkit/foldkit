import { Duration, Effect, Fiber, Option, Schema, Stream } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/index.js'
import { Message, SwipeState, make } from './index.js'

const TestPayload = Schema.Struct({ body: Schema.String })
const Toast = make(TestPayload)

type Model = typeof Toast.Model.Type
type Entry = typeof Toast.Entry.Type
type ToastMessage = typeof Toast.Message.Type

const POINTER_ID = 1
const OTHER_POINTER_ID = 2

const makeDraggingEntry = (
  id: string,
  pointerId: number,
  startX: number,
): Entry => ({
  id,
  variant: 'Info',
  animation: Animation.init({ id, isShowing: true }),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Dragging({ pointerId, startX, currentX: startX }),
  swipeVersion: 0,
  payload: { body: 'Hello' },
})

const withDraggingEntries = (entries: ReadonlyArray<Entry>): Model =>
  modifyFields(Toast.init({ id: 'test', swipeToDismiss: {} }), {
    entries: () => entries,
    nextEntryKey: () => entries.length,
  })

const waitForNextTurn = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

describe('Toast Subscriptions', () => {
  it('Escape emits one Message without reacting to other keys', async () => {
    const model = withDraggingEntries([
      makeDraggingEntry('test-entry-0', POINTER_ID, 100),
      makeDraggingEntry('test-entry-1', OTHER_POINTER_ID, 200),
    ])
    const dependencies =
      Toast.subscriptions.swipeEscape.modelToDependencies(model)
    const stream =
      Toast.subscriptions.swipeEscape.dependenciesToStream(dependencies)
    const received: Array<ToastMessage> = []
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
    documentElement.style.setProperty('user-select', 'text')
    documentElement.style.setProperty('-webkit-user-select', 'text')

    const model = withDraggingEntries([
      makeDraggingEntry('test-entry-0', POINTER_ID, 100),
    ])
    const dependencies =
      Toast.subscriptions.swipePointer.modelToDependencies(model)
    expect(dependencies.isAnyDragging).toBe(true)
    const stream =
      Toast.subscriptions.swipePointer.dependenciesToStream(dependencies)
    const fiber = Effect.runFork(Stream.runDrain(stream))

    try {
      await vi.waitFor(() => {
        expect(document.head.querySelectorAll('style')).toHaveLength(
          previousStyleCount + 1,
        )
      })

      expect(documentElement.style.getPropertyValue('user-select')).toBe('text')
      expect(
        documentElement.style.getPropertyValue('-webkit-user-select'),
      ).toBe('text')

      await Effect.runPromise(Fiber.interrupt(fiber))

      expect(documentElement.style.getPropertyValue('user-select')).toBe('text')
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
