import { Cause, Effect, Exit, Fiber, Option, Stream } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  DragAndDropLive,
  DragState,
  FocusItem,
  Message,
  OutMessage,
  ResolveKeyboardMove,
  ghostStyle,
  isDragging,
  maybeDraggedItemId,
  maybeDropTarget,
  streamKeyboardDragEvents,
} from './block.js'
import * as DragAndDropTest from './test.js'

const expectStoryFailure = <E, R>(
  story: Effect.Effect<void, E, R>,
  message: string,
): Effect.Effect<void, never, R> =>
  Effect.map(Effect.exit(story), exit => {
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(Cause.pretty(exit.cause)).toContain(message)
    }
  })

const waitForNextTurn = (): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, 0))

const pressedDraggable = Message.PressedDraggable({
  itemId: 'item-1',
  containerId: 'list-1',
  index: 0,
  screenX: 100,
  screenY: 200,
})

const movedPointer = (
  overrides: Readonly<
    Partial<{
      screenX: number
      screenY: number
      clientX: number
      clientY: number
      maybeDropTarget: Option.Option<{ containerId: string; index: number }>
    }>
  > = {},
) =>
  Message.MovedPointer({
    screenX: overrides.screenX ?? 110,
    screenY: overrides.screenY ?? 200,
    clientX: overrides.clientX ?? 110,
    clientY: overrides.clientY ?? 200,
    maybeDropTarget: overrides.maybeDropTarget ?? Option.none(),
  })

const movedPointerAboveThreshold = movedPointer()

const activatedKeyboardDrag = Message.ActivatedKeyboardDrag({
  itemId: 'item-1',
  containerId: 'list-1',
  index: 0,
})

const idleModel = {
  id: 'DragAndDrop',
  orientation: 'Vertical',
  activationThreshold: 5,
  keyboardDragGeneration: 0,
  dragState: DragState.Idle(),
}

const movedPointerBelowThreshold = movedPointer({
  screenX: 102,
  screenY: 201,
  clientX: 102,
  clientY: 201,
})

describe('DragAndDrop', () => {
  describe('init', () => {
    it.effect('starts in the Idle state with Vertical orientation', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.model(model => {
          expect(model.id).toBe('DragAndDrop')
          expect(model.orientation).toBe('Vertical')
          expect(model.activationThreshold).toBe(5)
          expect(model.keyboardDragGeneration).toBe(0)
          expect(model.dragState._tag).toBe('Idle')
        }),
      ),
    )

    it.effect(
      'accepts a custom id, orientation, and activation threshold',
      () =>
        Story.story(
          DragAndDropLive,
          { id: 'test', orientation: 'Horizontal', activationThreshold: 12 },
          Story.model(model => {
            expect(model.id).toBe('test')
            expect(model.orientation).toBe('Horizontal')
            expect(model.activationThreshold).toBe(12)
          }),
        ),
    )

    it.effect('waits for a custom activation threshold before dragging', () =>
      Story.story(
        DragAndDropLive,
        { activationThreshold: 20 },
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => expect(model.dragState._tag).toBe('Pending')),
        Story.message(movedPointer({ screenX: 130, clientX: 130 })),
        Story.model(model => expect(model.dragState._tag).toBe('Dragging')),
      ),
    )
  })

  describe('update', () => {
    it.effect('transitions from Idle to Pending on PressedDraggable', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Pending')
          if (model.dragState._tag === 'Pending') {
            expect(model.dragState.itemId).toBe('item-1')
            expect(model.dragState.containerId).toBe('list-1')
            expect(model.dragState.index).toBe(0)
            expect(model.dragState.origin).toStrictEqual({
              screenX: 100,
              screenY: 200,
            })
          }
        }),
      ),
    )

    it.effect(
      'stays Pending when pointer moves below activation threshold',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(pressedDraggable),
          Story.message(movedPointerBelowThreshold),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Pending')
          }),
        ),
    )

    it.effect(
      'transitions from Pending to Dragging when pointer exceeds threshold',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Dragging')
            if (model.dragState._tag === 'Dragging') {
              expect(model.dragState.itemId).toBe('item-1')
              expect(model.dragState.sourceContainerId).toBe('list-1')
              expect(model.dragState.sourceIndex).toBe(0)
              expect(model.dragState.origin).toStrictEqual({
                screenX: 100,
                screenY: 200,
              })
              expect(model.dragState.current).toStrictEqual({
                clientX: 110,
                clientY: 200,
              })
              expect(model.dragState.maybeDropTarget).toStrictEqual(
                Option.none(),
              )
            }
          }),
        ),
    )

    it.effect(
      'transitions from Pending to Idle on ReleasedPointer (click)',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(pressedDraggable),
          Story.message(Message.ReleasedPointer()),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Idle')
          }),
        ),
    )

    it.effect('updates current position and drop target while Dragging', () => {
      const dropTarget = Option.some({ containerId: 'list-1', index: 2 })
      return Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(
          movedPointer({
            screenX: 150,
            screenY: 250,
            clientX: 150,
            clientY: 250,
            maybeDropTarget: dropTarget,
          }),
        ),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.current).toStrictEqual({
              clientX: 150,
              clientY: 250,
            })
            expect(model.dragState.maybeDropTarget).toStrictEqual(dropTarget)
          }
        }),
      )
    })

    it.effect(
      'transitions from Dragging to Idle on ReleasedPointer (drop)',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.message(Message.ReleasedPointer()),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Idle')
          }),
        ),
    )

    it.effect('transitions from Dragging to Idle on CancelledDrag', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(Message.CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      ),
    )

    it.effect('returns model unchanged when Idle receives MovedPointer', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(model).toStrictEqual(idleModel)
        }),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      ),
    )

    it.effect(
      'returns model unchanged when Idle receives ReleasedPointer',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(Message.ReleasedPointer()),
          Story.model(model => {
            expect(model).toStrictEqual(idleModel)
          }),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        ),
    )

    it.effect('returns to Idle when CancelledDrag received while Pending', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(Message.CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      ),
    )
  })

  describe('keyboard drag generations', () => {
    it.effect(
      'ignores a pending keyboard move completion after cancellation',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          Story.message(Message.PressedArrowKey({ direction: 'Down' })),
          Story.message(Message.CancelledDrag()),
          Story.expectOutMessage(OutMessage.Cancelled({ itemId: 'item-1' })),
          Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
          Story.Command.resolve(
            ResolveKeyboardMove,
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-1',
              targetIndex: 1,
            }),
          ),
          Story.model(model => expect(model.dragState._tag).toBe('Idle')),
          Story.Command.expectNone(),
        ),
    )

    it.effect.each(['item-1', 'item-2'])(
      'ignores a previous keyboard drag completion after restarting with %s',
      restartedItemId =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          Story.message(Message.PressedArrowKey({ direction: 'Down' })),
          Story.message(Message.CancelledDrag()),
          Story.expectOutMessage(OutMessage.Cancelled({ itemId: 'item-1' })),
          Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
          Story.message(
            Message.ActivatedKeyboardDrag({
              itemId: restartedItemId,
              containerId: 'list-1',
              index: 0,
            }),
          ),
          Story.Command.resolve(
            ResolveKeyboardMove,
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          Story.model(model => {
            expect(model.keyboardDragGeneration).toBe(2)
            expect(model.dragState._tag).toBe('KeyboardDragging')
            if (model.dragState._tag === 'KeyboardDragging') {
              expect(model.dragState.itemId).toBe(restartedItemId)
              expect(model.dragState.targetContainerId).toBe('list-1')
              expect(model.dragState.targetIndex).toBe(0)
            }
          }),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
        ),
    )
  })

  describe('OutMessage', () => {
    it.effect('emits Reordered when dropping on a valid drop target', () => {
      const dropTarget = Option.some({ containerId: 'list-1', index: 2 })
      return Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(movedPointer({ maybeDropTarget: dropTarget })),
        Story.message(Message.ReleasedPointer()),
        Story.expectOutMessage(
          OutMessage.Reordered({
            itemId: 'item-1',
            fromContainerId: 'list-1',
            fromIndex: 0,
            toContainerId: 'list-1',
            toIndex: 2,
          }),
        ),
      )
    })

    it.effect('emits Cancelled when dropping without a drop target', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(Message.ReleasedPointer()),
        Story.expectOutMessage(OutMessage.Cancelled({ itemId: 'item-1' })),
      ),
    )

    it.effect('emits Cancelled when CancelledDrag while Dragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(Message.CancelledDrag()),
        Story.expectOutMessage(OutMessage.Cancelled({ itemId: 'item-1' })),
      ),
    )

    it.effect('emits no OutMessage when CancelledDrag while Pending', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(Message.CancelledDrag()),
        Story.expectNoOutMessage(),
      ),
    )

    it.effect('emits no OutMessage on PressedDraggable', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.expectNoOutMessage(),
      ),
    )

    it.effect('emits no OutMessage on MovedPointer', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.expectNoOutMessage(),
      ),
    )
  })

  describe('ghostStyle', () => {
    it.effect('returns None when Idle', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.model(model => {
          expect(ghostStyle(model)).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('returns None when Pending', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(ghostStyle(model)).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect(
      'returns Some with client-coordinate positioning when Dragging',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(pressedDraggable),
          Story.message(movedPointerAboveThreshold),
          Story.model(model => {
            const result = ghostStyle(model)
            expect(Option.isSome(result)).toBe(true)
            if (Option.isSome(result)) {
              expect(result.value['position']).toBe('fixed')
              expect(result.value['transform']).toBe(
                'translate3d(110px, 200px, 0)',
              )
              expect(result.value['pointer-events']).toBe('none')
            }
          }),
        ),
    )
  })

  describe('isDragging', () => {
    it.effect('returns false when Idle', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.model(model => {
          expect(isDragging(model)).toBe(false)
        }),
      ),
    )

    it.effect('returns false when Pending', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(isDragging(model)).toBe(false)
        }),
      ),
    )

    it.effect('returns true when Dragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(isDragging(model)).toBe(true)
        }),
      ),
    )
  })

  describe('maybeDraggedItemId', () => {
    it.effect('returns None when Idle', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('returns Some with itemId when Pending', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.some('item-1'))
        }),
      ),
    )

    it.effect('returns Some with itemId when Dragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.some('item-1'))
        }),
      ),
    )
  })

  describe('maybeDropTarget', () => {
    it.effect('returns None when Idle', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('returns None when Pending', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('returns None when Dragging without a drop target', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(Option.none())
        }),
      ),
    )

    it.effect('returns Some when Dragging over a drop target', () => {
      const target = Option.some({ containerId: 'list-1', index: 2 })
      return Story.story(
        DragAndDropLive,
        {},
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(movedPointer({ maybeDropTarget: target })),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(target)
        }),
      )
    })

    it.effect('returns Some when KeyboardDragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(
            Option.some({ containerId: 'list-1', index: 0 }),
          )
        }),
      ),
    )
  })

  describe('keyboard drag', () => {
    it('prevents handled document keys before the native dispatch returns', async () => {
      const received: Array<Message> = []
      const fiber = Effect.runFork(
        Stream.runForEach(streamKeyboardDragEvents(), message =>
          Effect.sync(() => {
            received.push(message)
          }),
        ),
      )

      await waitForNextTurn()

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        cancelable: true,
      })
      document.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)

      await waitForNextTurn()
      await Effect.runPromise(Fiber.interrupt(fiber))

      expect(received).toEqual([
        Message.PressedArrowKey({ direction: 'NextContainer' }),
      ])
    })

    it.effect(
      'transitions from Idle to KeyboardDragging on ActivatedKeyboardDrag',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          Story.model(model => {
            expect(model.dragState._tag).toBe('KeyboardDragging')
            expect(model.keyboardDragGeneration).toBe(1)
            if (model.dragState._tag === 'KeyboardDragging') {
              expect(model.dragState.itemId).toBe('item-1')
              expect(model.dragState.sourceContainerId).toBe('list-1')
              expect(model.dragState.sourceIndex).toBe(0)
              expect(model.dragState.targetContainerId).toBe('list-1')
              expect(model.dragState.targetIndex).toBe(0)
            }
          }),
        ),
    )

    it.effect(
      'emits keyboard facts without announcing an unchanged or inactive target',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          Story.expectOutMessage(
            OutMessage.StartedKeyboardDrag({
              itemId: 'item-1',
              containerId: 'list-1',
              index: 0,
            }),
          ),
          Story.message(
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          Story.expectOutMessage(
            OutMessage.ChangedKeyboardTarget({
              itemId: 'item-1',
              fromContainerId: 'list-1',
              fromIndex: 0,
              toContainerId: 'list-2',
              toIndex: 3,
            }),
          ),
          Story.Command.resolve(
            FocusItem({ itemId: 'item-1' }),
            Message.CompletedFocusItem(),
          ),
          Story.expectNoOutMessage(),
          Story.message(
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.resolve(
            FocusItem({ itemId: 'item-1' }),
            Message.CompletedFocusItem(),
          ),
          Story.message(Message.CancelledDrag()),
          Story.expectOutMessage(OutMessage.Cancelled({ itemId: 'item-1' })),
          Story.Command.resolve(
            FocusItem({ itemId: 'item-1' }),
            Message.CompletedFocusItem(),
          ),
          Story.message(
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-1',
              targetIndex: 0,
            }),
          ),
          Story.expectNoOutMessage(),
          Story.model(model => expect(model.dragState._tag).toBe('Idle')),
        ),
    )

    it.effect(
      'creates ResolveKeyboardMove command on PressedArrowKey and resolves target',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          Story.message(Message.PressedArrowKey({ direction: 'Down' })),
          Story.Command.resolve(
            ResolveKeyboardMove,
            Message.CompletedResolveKeyboardMove({
              keyboardDragGeneration: 1,
              targetContainerId: 'list-1',
              targetIndex: 1,
            }),
          ),
          Story.Command.resolve(
            FocusItem({ itemId: 'item-1' }),
            Message.CompletedFocusItem(),
          ),
          Story.model(model => {
            expect(model.dragState._tag).toBe('KeyboardDragging')
            if (model.dragState._tag === 'KeyboardDragging') {
              expect(model.dragState.targetIndex).toBe(1)
            }
          }),
        ),
    )

    it.effect('updates target on CompletedResolveKeyboardMove', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.message(
          Message.CompletedResolveKeyboardMove({
            keyboardDragGeneration: 1,
            targetContainerId: 'list-2',
            targetIndex: 3,
          }),
        ),
        Story.Command.resolve(
          FocusItem({ itemId: 'item-1' }),
          Message.CompletedFocusItem(),
        ),
        Story.model(model => {
          expect(model.dragState._tag).toBe('KeyboardDragging')
          if (model.dragState._tag === 'KeyboardDragging') {
            expect(model.dragState.targetContainerId).toBe('list-2')
            expect(model.dragState.targetIndex).toBe(3)
          }
        }),
      ),
    )

    it.effect('emits Reordered on ConfirmedKeyboardDrop', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.message(
          Message.CompletedResolveKeyboardMove({
            keyboardDragGeneration: 1,
            targetContainerId: 'list-2',
            targetIndex: 1,
          }),
        ),
        Story.Command.resolve(
          FocusItem({ itemId: 'item-1' }),
          Message.CompletedFocusItem(),
        ),
        Story.message(Message.ConfirmedKeyboardDrop()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
        Story.expectOutMessage(
          OutMessage.Reordered({
            itemId: 'item-1',
            fromContainerId: 'list-1',
            fromIndex: 0,
            toContainerId: 'list-2',
            toIndex: 1,
          }),
        ),
        Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
      ),
    )

    it.effect('emits Cancelled on CancelledDrag while KeyboardDragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.message(Message.CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
        Story.expectOutMessage(OutMessage.Cancelled({ itemId: 'item-1' })),
        Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
      ),
    )

    it.effect('isDragging returns true when KeyboardDragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(isDragging(model)).toBe(true)
        }),
      ),
    )

    it.effect('maybeDraggedItemId returns Some when KeyboardDragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.some('item-1'))
        }),
      ),
    )

    it.effect('ghostStyle returns None when KeyboardDragging', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(ghostStyle(model)).toStrictEqual(Option.none())
        }),
      ),
    )
  })

  describe('test helpers', () => {
    it.effect('settleFocus resolves focus after a keyboard drop', () =>
      Story.story(
        DragAndDropLive,
        {},
        Story.message(activatedKeyboardDrag),
        Story.message(Message.ConfirmedKeyboardDrop()),
        Story.expectOutMessage(
          OutMessage.Reordered({
            itemId: 'item-1',
            fromContainerId: 'list-1',
            fromIndex: 0,
            toContainerId: 'list-1',
            toIndex: 0,
          }),
        ),
        DragAndDropTest.settleFocus({ itemId: 'item-1' }),
        Story.model(model => {
          expect(isDragging(model)).toBe(false)
        }),
      ),
    )

    it.effect(
      'resolveKeyboardMove supplies the target and resolves focus',
      () =>
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          Story.message(
            Message.PressedArrowKey({ direction: 'NextContainer' }),
          ),
          DragAndDropTest.resolveKeyboardMove({
            itemId: 'item-1',
            targetContainerId: 'list-2',
            targetIndex: 3,
          }),
          Story.model(model => {
            expect(maybeDropTarget(model)).toEqual(
              Option.some({ containerId: 'list-2', index: 3 }),
            )
          }),
        ),
    )

    it.effect('settleFocus rejects a missing focus Command', () =>
      expectStoryFailure(
        Story.story(
          DragAndDropLive,
          {},
          DragAndDropTest.settleFocus({ itemId: 'item-1' }),
        ),
        'no matching pending Command was found',
      ),
    )

    it.effect(
      'resolveKeyboardMove rejects a pending move for another item',
      () =>
        expectStoryFailure(
          Story.story(
            DragAndDropLive,
            {},
            Story.message(activatedKeyboardDrag),
            Story.message(
              Message.PressedArrowKey({ direction: 'NextContainer' }),
            ),
            DragAndDropTest.resolveKeyboardMove({
              itemId: 'item-2',
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          'could not find a pending keyboard move for item "item-2"',
        ),
    )

    it.effect(
      'resolveKeyboardMove rejects duplicate pending moves for the item',
      () =>
        expectStoryFailure(
          Story.story(
            DragAndDropLive,
            {},
            Story.message(activatedKeyboardDrag),
            Story.message(
              Message.PressedArrowKey({ direction: 'NextContainer' }),
            ),
            Story.message(
              Message.PressedArrowKey({ direction: 'NextContainer' }),
            ),
            DragAndDropTest.resolveKeyboardMove({
              itemId: 'item-1',
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          'Isolate one pending move in this Story',
        ),
    )

    it.effect('resolveKeyboardMove rejects a missing move Command', () =>
      expectStoryFailure(
        Story.story(
          DragAndDropLive,
          {},
          Story.message(activatedKeyboardDrag),
          DragAndDropTest.resolveKeyboardMove({
            itemId: 'item-1',
            targetContainerId: 'list-2',
            targetIndex: 3,
          }),
        ),
        'could not find a pending keyboard move',
      ),
    )

    it.effect(
      'resolveKeyboardMove rejects a move that produces no focus Command',
      () =>
        expectStoryFailure(
          Story.story(
            DragAndDropLive,
            {},
            Story.message(activatedKeyboardDrag),
            Story.message(
              Message.PressedArrowKey({ direction: 'NextContainer' }),
            ),
            Story.message(Message.CancelledDrag()),
            Story.Command.resolve(FocusItem, Message.CompletedFocusItem()),
            Story.message(activatedKeyboardDrag),
            DragAndDropTest.resolveKeyboardMove({
              itemId: 'item-1',
              targetContainerId: 'list-2',
              targetIndex: 3,
            }),
          ),
          'no matching pending Command was found',
        ),
    )
  })
})
