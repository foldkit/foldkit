import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story.js'
import {
  ActivatedKeyboardDrag,
  Cancelled,
  CancelledDrag,
  CompletedFocusItem,
  ConfirmedKeyboardDrop,
  FocusItem,
  MovedPointer,
  PressedArrowKey,
  PressedDraggable,
  ReleasedPointer,
  Reordered,
  ResolveKeyboardMove,
  ResolvedKeyboardMove,
  ghostStyle,
  init,
  isDragging,
  maybeDraggedItemId,
  maybeDropTarget,
  update,
} from './index.js'

const defaultInit = () => init({ id: 'test' })

const pressedDraggable = PressedDraggable({
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
  MovedPointer({
    screenX: overrides.screenX ?? 110,
    screenY: overrides.screenY ?? 200,
    clientX: overrides.clientX ?? 110,
    clientY: overrides.clientY ?? 200,
    maybeDropTarget: overrides.maybeDropTarget ?? Option.none(),
  })

const movedPointerAboveThreshold = movedPointer()

const activatedKeyboardDrag = ActivatedKeyboardDrag({
  itemId: 'item-1',
  containerId: 'list-1',
  index: 0,
})

const movedPointerBelowThreshold = movedPointer({
  screenX: 102,
  screenY: 201,
  clientX: 102,
  clientY: 201,
})

describe('DragAndDrop', () => {
  describe('init', () => {
    it('starts in the Idle state with Vertical orientation', () => {
      const model = defaultInit()
      expect(model.id).toBe('test')
      expect(model.orientation).toBe('Vertical')
      expect(model.dragState._tag).toBe('Idle')
    })

    it('accepts a custom orientation', () => {
      const model = init({ id: 'test', orientation: 'Horizontal' })
      expect(model.orientation).toBe('Horizontal')
    })
  })

  describe('update', () => {
    it('transitions from Idle to Pending on PressedDraggable', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
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
      )
    })

    it('stays Pending when pointer moves below activation threshold', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerBelowThreshold),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Pending')
        }),
      )
    })

    it('transitions from Pending to Dragging when pointer exceeds threshold', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
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
            expect(model.dragState.maybeDropTarget).toStrictEqual(Option.none())
          }
        }),
      )
    })

    it('transitions from Pending to Idle on ReleasedPointer (click)', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(ReleasedPointer()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })

    it('updates current position and drop target while Dragging', () => {
      const dropTarget = Option.some({ containerId: 'list-1', index: 2 })
      Story.story(
        update,
        Story.with(defaultInit()),
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

    it('transitions from Dragging to Idle on ReleasedPointer (drop)', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(ReleasedPointer()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })

    it('transitions from Dragging to Idle on CancelledDrag', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })

    it('returns model unchanged when Idle receives MovedPointer', () => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it('returns model unchanged when Idle receives ReleasedPointer', () => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(ReleasedPointer()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it('returns to Idle when CancelledDrag received while Pending', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })
  })

  describe('OutMessage', () => {
    it('emits Reordered when dropping on a valid drop target', () => {
      const dropTarget = Option.some({ containerId: 'list-1', index: 2 })
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(movedPointer({ maybeDropTarget: dropTarget })),
        Story.message(ReleasedPointer()),
        Story.expectOutMessage(
          Reordered({
            itemId: 'item-1',
            fromContainerId: 'list-1',
            fromIndex: 0,
            toContainerId: 'list-1',
            toIndex: 2,
          }),
        ),
      )
    })

    it('emits Cancelled when dropping without a drop target', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(ReleasedPointer()),
        Story.expectOutMessage(Cancelled()),
      )
    })

    it('emits Cancelled when CancelledDrag while Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(CancelledDrag()),
        Story.expectOutMessage(Cancelled()),
      )
    })

    it('emits no OutMessage when CancelledDrag while Pending', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(CancelledDrag()),
        Story.expectNoOutMessage(),
      )
    })

    it('emits no OutMessage on PressedDraggable', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.expectNoOutMessage(),
      )
    })

    it('emits no OutMessage on MovedPointer', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.expectNoOutMessage(),
      )
    })
  })

  describe('ghostStyle', () => {
    it('returns None when Idle', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.model(model => {
          expect(ghostStyle(model)).toStrictEqual(Option.none())
        }),
      )
    })

    it('returns None when Pending', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(ghostStyle(model)).toStrictEqual(Option.none())
        }),
      )
    })

    it('returns Some with client-coordinate positioning when Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          const result = ghostStyle(model)
          expect(Option.isSome(result)).toBe(true)
          if (Option.isSome(result)) {
            expect(result.value.position).toBe('fixed')
            expect(result.value.transform).toBe('translate3d(110px, 200px, 0)')
            expect(result.value['pointer-events']).toBe('none')
          }
        }),
      )
    })
  })

  describe('isDragging', () => {
    it('returns false when Idle', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.model(model => {
          expect(isDragging(model)).toBe(false)
        }),
      )
    })

    it('returns false when Pending', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(isDragging(model)).toBe(false)
        }),
      )
    })

    it('returns true when Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(isDragging(model)).toBe(true)
        }),
      )
    })
  })

  describe('maybeDraggedItemId', () => {
    it('returns None when Idle', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.none())
        }),
      )
    })

    it('returns Some with itemId when Pending', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.some('item-1'))
        }),
      )
    })

    it('returns Some with itemId when Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.some('item-1'))
        }),
      )
    })
  })

  describe('maybeDropTarget', () => {
    it('returns None when Idle', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(Option.none())
        }),
      )
    })

    it('returns None when Pending', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(Option.none())
        }),
      )
    })

    it('returns None when Dragging without a drop target', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(Option.none())
        }),
      )
    })

    it('returns Some when Dragging over a drop target', () => {
      const target = Option.some({ containerId: 'list-1', index: 2 })
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(pressedDraggable),
        Story.message(movedPointerAboveThreshold),
        Story.message(movedPointer({ maybeDropTarget: target })),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(target)
        }),
      )
    })

    it('returns Some when KeyboardDragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(maybeDropTarget(model)).toStrictEqual(
            Option.some({ containerId: 'list-1', index: 0 }),
          )
        }),
      )
    })
  })

  describe('keyboard drag', () => {
    it('transitions from Idle to KeyboardDragging on ActivatedKeyboardDrag', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(model.dragState._tag).toBe('KeyboardDragging')
          if (model.dragState._tag === 'KeyboardDragging') {
            expect(model.dragState.itemId).toBe('item-1')
            expect(model.dragState.sourceContainerId).toBe('list-1')
            expect(model.dragState.sourceIndex).toBe(0)
            expect(model.dragState.targetContainerId).toBe('list-1')
            expect(model.dragState.targetIndex).toBe(0)
          }
        }),
      )
    })

    it('creates ResolveKeyboardMove command on PressedArrowKey and resolves target', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.message(PressedArrowKey({ direction: 'Down' })),
        Story.resolve(
          ResolveKeyboardMove,
          ResolvedKeyboardMove({ targetContainerId: 'list-1', targetIndex: 1 }),
        ),
        Story.model(model => {
          expect(model.dragState._tag).toBe('KeyboardDragging')
          if (model.dragState._tag === 'KeyboardDragging') {
            expect(model.dragState.targetIndex).toBe(1)
          }
        }),
      )
    })

    it('updates target on ResolvedKeyboardMove', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.message(
          ResolvedKeyboardMove({
            targetContainerId: 'list-2',
            targetIndex: 3,
          }),
        ),
        Story.model(model => {
          expect(model.dragState._tag).toBe('KeyboardDragging')
          if (model.dragState._tag === 'KeyboardDragging') {
            expect(model.dragState.targetContainerId).toBe('list-2')
            expect(model.dragState.targetIndex).toBe(3)
          }
        }),
      )
    })

    it('emits Reordered on ConfirmedKeyboardDrop', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.message(
          ResolvedKeyboardMove({
            targetContainerId: 'list-2',
            targetIndex: 1,
          }),
        ),
        Story.message(ConfirmedKeyboardDrop()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
        Story.expectOutMessage(
          Reordered({
            itemId: 'item-1',
            fromContainerId: 'list-1',
            fromIndex: 0,
            toContainerId: 'list-2',
            toIndex: 1,
          }),
        ),
        Story.resolve(FocusItem, CompletedFocusItem()),
      )
    })

    it('emits Cancelled on CancelledDrag while KeyboardDragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.message(CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
        Story.expectOutMessage(Cancelled()),
        Story.resolve(FocusItem, CompletedFocusItem()),
      )
    })

    it('isDragging returns true when KeyboardDragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(isDragging(model)).toBe(true)
        }),
      )
    })

    it('maybeDraggedItemId returns Some when KeyboardDragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(maybeDraggedItemId(model)).toStrictEqual(Option.some('item-1'))
        }),
      )
    })

    it('ghostStyle returns None when KeyboardDragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(activatedKeyboardDrag),
        Story.model(model => {
          expect(ghostStyle(model)).toStrictEqual(Option.none())
        }),
      )
    })
  })
})
