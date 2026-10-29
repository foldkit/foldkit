import { Duration, Effect, Fiber, Option, Schema, Stream } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { Message, SwipeState } from './toast.js'
import { makeFixture } from './toast.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type
const ToastFixture = makeFixture(TestPayload)
const block = ToastFixture.block
const toastInit = ToastFixture.init

type Model = typeof block.Model.Type
type Entry = typeof ToastFixture.Entry.Type
type ToastMessage = typeof block.Message.Type

const POINTER_ID = 1
const OTHER_POINTER_ID = 2

const makeDraggingEntry = (
  id: string,
  pointerId: number,
  startX: number,
): Entry => ({
  id,
  variant: 'Info',
  animation: Animation.init({ id, isShowing: true }).model,
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Dragging({ pointerId, startX, currentX: startX }),
  swipeVersion: 0,
  payload: { body: 'Hello' },
})

const withDraggingEntries = (entries: ReadonlyArray<Entry>): Model =>
  modifyFields(toastInit({ id: 'test', swipeToDismiss: {} }).model, {
    entries: () => entries,
    nextEntryKey: () => entries.length,
  })

const waitForNextTurn = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

describe('Toast Subscriptions', () => {
  it('emits PressedEscape only for the Escape key', async () => {
    const model = withDraggingEntries([
      makeDraggingEntry('test-entry-0', POINTER_ID, 100),
      makeDraggingEntry('test-entry-1', OTHER_POINTER_ID, 200),
    ])
    const dependencies =
      block.subscriptions.swipeEscape.modelToDependencies(model)
    const stream =
      block.subscriptions.swipeEscape.dependenciesToStream(dependencies)
    const received: Array<ToastMessage> = []
    const fiber = Effect.runFork(
      Stream.runForEach(stream, message =>
        Effect.sync(() => {
          received.push(message)
        }),
      ).pipe(Effect.provide(block.EffectsLayer)),
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

    const model = withDraggingEntries([
      makeDraggingEntry('test-entry-0', POINTER_ID, 100),
    ])
    const dependencies =
      block.subscriptions.swipePointer.modelToDependencies(model)
    expect(dependencies.isAnyDragging).toBe(true)
    const stream =
      block.subscriptions.swipePointer.dependenciesToStream(dependencies)
    const fiber = Effect.runFork(
      Stream.runDrain(stream).pipe(Effect.provide(block.EffectsLayer)),
    )

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
