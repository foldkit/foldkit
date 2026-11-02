import { Duration, Effect, Fiber, Option, Schema, Stream } from 'effect'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { it as baseIt, expect, vi } from 'vitest'

import { describe } from '@effect/vitest'

import { makeInitialModel } from '../animation/schema.js'
import { Message, SwipeState } from './toast.js'
import { layer, makeFixture } from './toast.js'

const TestPayload = Schema.Struct({ body: Schema.String })
type TestPayload = typeof TestPayload.Type
const ToastFixture = makeFixture(TestPayload)
const ToastBlock = ToastFixture.block

type Model = typeof ToastBlock.Model.Type
type Entry = typeof ToastFixture.Entry.Type
type ToastMessage = typeof ToastFixture.Message.Type

const POINTER_ID = 1
const OTHER_POINTER_ID = 2

const makeDraggingEntry = (
  id: string,
  pointerId: number,
  startX: number,
): Entry => ({
  id,
  variant: 'Info',
  animation: makeInitialModel({ id, isShowing: true }),
  maybeDuration: Option.some(Duration.seconds(4)),
  pendingDismissVersion: 0,
  isHovered: false,
  swipeState: SwipeState.Dragging({ pointerId, startX, currentX: startX }),
  swipeVersion: 0,
  payload: { body: 'Hello' },
})

const waitForNextTurn = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

const makeTestFixture = (block: Story.TestBlock<typeof ToastBlock>) => {
  const toastInit = block.init
  const withDraggingEntries = (entries: ReadonlyArray<Entry>): Model =>
    modifyFields(toastInit({ id: 'test', swipeToDismiss: {} }).model, {
      entries: () => entries,
      nextEntryKey: () => entries.length,
    })

  return { toastInit, withDraggingEntries }
}

const it = baseIt.extend<{ toast: ReturnType<typeof makeTestFixture> }>({
  toast: async ({}, use) =>
    Effect.runPromise(
      Story.withBlock(ToastBlock, block =>
        Effect.promise(() => use(makeTestFixture(block))),
      ).pipe(Effect.provide(layer)),
    ),
})

describe('Toast Subscriptions', () => {
  it('emits PressedEscape only for the Escape key', async ({
    toast: { withDraggingEntries },
  }) => {
    const model = withDraggingEntries([
      makeDraggingEntry('test-entry-0', POINTER_ID, 100),
      makeDraggingEntry('test-entry-1', OTHER_POINTER_ID, 200),
    ])
    const dependencies =
      ToastFixture.subscriptions.swipeEscape.modelToDependencies(model)
    const stream =
      ToastFixture.subscriptions.swipeEscape.dependenciesToStream(dependencies)
    const received: Array<ToastMessage> = []
    const fiber = Effect.runFork(
      Stream.runForEach(stream, message =>
        Effect.sync(() => {
          received.push(message)
        }),
      ).pipe(Effect.provide(ToastFixture.EffectsLayer)),
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

  it('leaves existing document selection styles intact while dragging', async ({
    toast: { withDraggingEntries },
  }) => {
    const documentElement = document.documentElement
    const previousStyle = documentElement.getAttribute('style')
    const previousStyleCount = document.head.querySelectorAll('style').length
    const existingStyle = 'user-select: text; -webkit-user-select: text'
    documentElement.setAttribute('style', existingStyle)

    const model = withDraggingEntries([
      makeDraggingEntry('test-entry-0', POINTER_ID, 100),
    ])
    const dependencies =
      ToastFixture.subscriptions.swipePointer.modelToDependencies(model)
    expect(dependencies.isAnyDragging).toBe(true)
    const stream =
      ToastFixture.subscriptions.swipePointer.dependenciesToStream(dependencies)
    const fiber = Effect.runFork(
      Stream.runDrain(stream).pipe(Effect.provide(ToastFixture.EffectsLayer)),
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
