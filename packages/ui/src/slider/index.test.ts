import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import {
  CancelledDrag,
  ChangedValue,
  MovedDragPointer,
  PressedKeyboardNavigation,
  PressedPointer,
  PressedThumb,
  ReleasedDragPointer,
  fractionOfValue,
  init,
  reflectRange,
  snapAndClamp,
  update,
} from './index.js'

const defaultInit = () => init({ id: 'test', min: 0, max: 10, step: 1 })

describe('Slider', () => {
  describe('init', () => {
    it('starts Idle with the configured range', () => {
      const model = defaultInit()
      expect(model.id).toBe('test')
      expect(model.min).toBe(0)
      expect(model.max).toBe(10)
      expect(model.step).toBe(1)
      expect(model.dragState._tag).toBe('Idle')
    })
  })

  describe('snapAndClamp', () => {
    it('clamps above max to max', () => {
      expect(snapAndClamp(99, 0, 10, 1)).toBe(10)
    })

    it('clamps below min to min', () => {
      expect(snapAndClamp(-5, 0, 10, 1)).toBe(0)
    })

    it('snaps to step', () => {
      expect(snapAndClamp(3, 0, 10, 2)).toBe(4)
    })

    it('handles fractional step without floating-point drift', () => {
      expect(snapAndClamp(0.3, 0, 1, 0.1)).toBe(0.3)
    })
  })

  describe('keyboard navigation', () => {
    it('increments by step on StepIncrement', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement', value: 5 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 6 })),
      )
    })

    it('decrements by step on StepDecrement', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepDecrement', value: 5 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 4 })),
      )
    })

    it('increments by 10 steps on PageIncrement', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 100, step: 1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'PageIncrement', value: 20 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 30 })),
      )
    })

    it('decrements by 10 steps on PageDecrement', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 100, step: 1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'PageDecrement', value: 30 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 20 })),
      )
    })

    it('jumps to min on Min', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 2, max: 20, step: 1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'Min', value: 10 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 2 })),
      )
    })

    it('jumps to max on Max', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 99, step: 1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'Max', value: 10 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 99 })),
      )
    })

    it('emits no OutMessage when a step increment is clamped to the same value', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 10, step: 1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement', value: 10 }),
        ),
        Story.expectNoOutMessage(),
      )
    })

    it('emits no OutMessage when a step decrement is clamped to the same value', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 10, step: 1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepDecrement', value: 0 }),
        ),
        Story.expectNoOutMessage(),
      )
    })

    it('respects fractional step (0.1)', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 1, step: 0.1 })),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement', value: 0.2 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 0.3 })),
      )
    })
  })

  describe('thumb press', () => {
    it('starts a drag without emitting an OutMessage', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedThumb({ originValue: 5 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      )
    })

    it('ignores a bubbled PressedPointer after PressedThumb so the value is not shifted', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 1, step: 0.05 })),
        Story.message(PressedThumb({ originValue: 0.5 })),
        Story.message(PressedPointer({ value: 0.45, originValue: 0.5 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(0.5)
          }
        }),
      )
    })

    it('is a no-op when already Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 9, originValue: 5 })),
        Story.message(PressedThumb({ originValue: 99 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      )
    })
  })

  describe('pointer drag', () => {
    it('snaps value and starts a drag on track press', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 7, originValue: 5 })),
        Story.expectOutMessage(ChangedValue({ value: 7 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      )
    })

    it('ignores PressedPointer while Dragging (absorbs the thumb→track bubble)', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 7, originValue: 5 })),
        Story.message(PressedPointer({ value: 8, originValue: 7 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      )
    })

    it('snaps PressedPointer value to step', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', min: 0, max: 10, step: 2 })),
        Story.message(PressedPointer({ value: 4.7, originValue: 0 })),
        Story.expectOutMessage(ChangedValue({ value: 4 })),
      )
    })

    it('emits the snapped value on MovedDragPointer while Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 3, originValue: 5 })),
        Story.message(MovedDragPointer({ value: 8 })),
        Story.expectOutMessage(ChangedValue({ value: 8 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
        }),
      )
    })

    it('ignores MovedDragPointer when Idle', () => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(MovedDragPointer({ value: 8 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it('transitions from Dragging to Idle on ReleasedDragPointer', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 3, originValue: 5 })),
        Story.message(ReleasedDragPointer()),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })

    it('ignores ReleasedDragPointer when Idle', () => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(ReleasedDragPointer()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it('emits the origin value on CancelledDrag while Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 9, originValue: 5 })),
        Story.message(MovedDragPointer({ value: 2 })),
        Story.message(CancelledDrag()),
        Story.expectOutMessage(ChangedValue({ value: 5 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })

    it('emits the origin value on CancelledDrag after PressedThumb', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedThumb({ originValue: 5 })),
        Story.message(MovedDragPointer({ value: 9 })),
        Story.message(CancelledDrag()),
        Story.expectOutMessage(ChangedValue({ value: 5 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      )
    })

    it('ignores CancelledDrag when Idle', () => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(CancelledDrag()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it('clamps MovedDragPointer above max', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 5, originValue: 5 })),
        Story.message(MovedDragPointer({ value: 42 })),
        Story.expectOutMessage(ChangedValue({ value: 10 })),
      )
    })

    it('clamps MovedDragPointer below min', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 5, originValue: 5 })),
        Story.message(MovedDragPointer({ value: -4 })),
        Story.expectOutMessage(ChangedValue({ value: 0 })),
      )
    })
  })

  describe('OutMessage', () => {
    it('emits ChangedValue on StepIncrement when value changes', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement', value: 5 }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 6 })),
      )
    })

    it('emits ChangedValue when restoring origin on CancelledDrag', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 9, originValue: 5 })),
        Story.message(CancelledDrag()),
        Story.expectOutMessage(ChangedValue({ value: 5 })),
      )
    })

    it('emits no OutMessage on ReleasedDragPointer (value already set during drag)', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 3, originValue: 5 })),
        Story.message(ReleasedDragPointer()),
        Story.expectNoOutMessage(),
      )
    })

    it('emits no OutMessage when PressedPointer snaps to the current value', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 5, originValue: 5 })),
        Story.expectNoOutMessage(),
      )
    })
  })

  describe('fractionOfValue', () => {
    it('returns 0 at min', () => {
      expect(fractionOfValue(0, 0, 10)).toBe(0)
    })

    it('returns 1 at max', () => {
      expect(fractionOfValue(10, 0, 10)).toBe(1)
    })

    it('returns 0.5 at midpoint', () => {
      expect(fractionOfValue(5, 0, 10)).toBe(0.5)
    })

    it('handles a negative-min range', () => {
      expect(fractionOfValue(0, -10, 10)).toBe(0.5)
    })

    it('returns 0 when min equals max', () => {
      expect(fractionOfValue(5, 5, 5)).toBe(0)
    })
  })

  describe('reflectRange', () => {
    it('updates min and max', () => {
      const before = defaultInit()
      const after = reflectRange(before, { min: 100, max: 200 })
      expect(after.min).toBe(100)
      expect(after.max).toBe(200)
    })

    it('supports the data-last form for point-free use in evo', () => {
      const widen = reflectRange({ min: 0, max: 50 })
      const after = widen(defaultInit())
      expect(after.min).toBe(0)
      expect(after.max).toBe(50)
    })

    it('updates the range even while Dragging', () => {
      const [draggingModel] = update(
        defaultInit(),
        PressedThumb({ originValue: 5 }),
      )
      expect(draggingModel.dragState._tag).toBe('Dragging')

      const after = reflectRange(draggingModel, { min: 7, max: 10 })
      expect(after.min).toBe(7)
      expect(after.max).toBe(10)
      expect(after.dragState._tag).toBe('Dragging')
    })
  })
})
