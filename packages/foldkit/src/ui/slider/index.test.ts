import { describe, expect, it } from 'vitest'

import * as Story from '../../test/story'
import {
  CancelledDrag,
  ChangedValue,
  MovedDragPointer,
  PressedKeyboardNavigation,
  PressedPointer,
  ReleasedDragPointer,
  fractionOfValue,
  init,
  update,
} from './index'

const defaultInit = () =>
  init({ id: 'test', min: 0, max: 10, step: 1, initialValue: 5 })

describe('Slider', () => {
  describe('init', () => {
    it('starts in the Idle state with the initial value', () => {
      const model = defaultInit()
      expect(model.id).toBe('test')
      expect(model.min).toBe(0)
      expect(model.max).toBe(10)
      expect(model.step).toBe(1)
      expect(model.value).toBe(5)
      expect(model.dragState._tag).toBe('Idle')
    })

    it('defaults initialValue to min', () => {
      const model = init({ id: 'test', min: 3, max: 10 })
      expect(model.value).toBe(3)
    })

    it('defaults step to 1', () => {
      const model = init({ id: 'test', min: 0, max: 10 })
      expect(model.step).toBe(1)
    })

    it('clamps initialValue above max to max', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 10,
        step: 1,
        initialValue: 99,
      })
      expect(model.value).toBe(10)
    })

    it('clamps initialValue below min to min', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 10,
        step: 1,
        initialValue: -5,
      })
      expect(model.value).toBe(0)
    })

    it('snaps initialValue to step', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 10,
        step: 2,
        initialValue: 3,
      })
      expect(model.value).toBe(4)
    })

    it('handles fractional step without floating-point drift', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 1,
        step: 0.1,
        initialValue: 0.3,
      })
      expect(model.value).toBe(0.3)
    })
  })

  describe('keyboard navigation', () => {
    it('increments by step on StepIncrement', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(6)
        }),
      )
    })

    it('decrements by step on StepDecrement', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepDecrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(4)
        }),
      )
    })

    it('increments by 10 steps on PageIncrement', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 100, step: 1, initialValue: 20 }),
        ),
        Story.message(
          PressedKeyboardNavigation({ direction: 'PageIncrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(30)
        }),
      )
    })

    it('decrements by 10 steps on PageDecrement', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 100, step: 1, initialValue: 30 }),
        ),
        Story.message(
          PressedKeyboardNavigation({ direction: 'PageDecrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(20)
        }),
      )
    })

    it('jumps to min on Min', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 2, max: 20, step: 1, initialValue: 10 }),
        ),
        Story.message(PressedKeyboardNavigation({ direction: 'Min' })),
        Story.model(model => {
          expect(model.value).toBe(2)
        }),
      )
    })

    it('jumps to max on Max', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 99, step: 1, initialValue: 10 }),
        ),
        Story.message(PressedKeyboardNavigation({ direction: 'Max' })),
        Story.model(model => {
          expect(model.value).toBe(99)
        }),
      )
    })

    it('clamps to max when step increment would overshoot', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 10, step: 1, initialValue: 10 }),
        ),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(10)
        }),
      )
    })

    it('clamps to min when step decrement would undershoot', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 10, step: 1, initialValue: 0 }),
        ),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepDecrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(0)
        }),
      )
    })

    it('respects fractional step (0.1)', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 1, step: 0.1, initialValue: 0.2 }),
        ),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement' }),
        ),
        Story.model(model => {
          expect(model.value).toBe(0.3)
        }),
      )
    })
  })

  describe('pointer drag', () => {
    it('transitions from Idle to Dragging on PressedPointer', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 7 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
          expect(model.value).toBe(7)
        }),
      )
    })

    it('preserves originValue when PressedPointer fires again while Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 7 })),
        Story.message(PressedPointer({ value: 8 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
          expect(model.value).toBe(8)
        }),
      )
    })

    it('snaps PressedPointer value to step', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 10, step: 2, initialValue: 0 }),
        ),
        Story.message(PressedPointer({ value: 4.7 })),
        Story.model(model => {
          expect(model.value).toBe(4)
        }),
      )
    })

    it('updates value on MovedDragPointer while Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 3 })),
        Story.message(MovedDragPointer({ value: 8 })),
        Story.model(model => {
          expect(model.value).toBe(8)
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
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it('transitions from Dragging to Idle on ReleasedDragPointer', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 3 })),
        Story.message(ReleasedDragPointer()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
          expect(model.value).toBe(3)
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

    it('restores origin value on CancelledDrag while Dragging', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 9 })),
        Story.message(MovedDragPointer({ value: 2 })),
        Story.message(CancelledDrag()),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
          expect(model.value).toBe(5)
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
        Story.message(PressedPointer({ value: 5 })),
        Story.message(MovedDragPointer({ value: 42 })),
        Story.model(model => {
          expect(model.value).toBe(10)
        }),
      )
    })

    it('clamps MovedDragPointer below min', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 5 })),
        Story.message(MovedDragPointer({ value: -4 })),
        Story.model(model => {
          expect(model.value).toBe(0)
        }),
      )
    })
  })

  describe('OutMessage', () => {
    it('emits ChangedValue on StepIncrement when value changes', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement' }),
        ),
        Story.expectOutMessage(ChangedValue({ value: 6 })),
      )
    })

    it('emits no OutMessage when StepIncrement is clamped to the same value', () => {
      Story.story(
        update,
        Story.with(
          init({ id: 'test', min: 0, max: 10, step: 1, initialValue: 10 }),
        ),
        Story.message(
          PressedKeyboardNavigation({ direction: 'StepIncrement' }),
        ),
        Story.expectNoOutMessage(),
      )
    })

    it('emits ChangedValue when restoring origin on CancelledDrag', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 9 })),
        Story.message(CancelledDrag()),
        Story.expectOutMessage(ChangedValue({ value: 5 })),
      )
    })

    it('emits no OutMessage on ReleasedDragPointer (value already set during drag)', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 3 })),
        Story.message(ReleasedDragPointer()),
        Story.expectNoOutMessage(),
      )
    })

    it('emits no OutMessage when PressedPointer snaps to current value', () => {
      Story.story(
        update,
        Story.with(defaultInit()),
        Story.message(PressedPointer({ value: 5 })),
        Story.expectNoOutMessage(),
      )
    })
  })

  describe('fractionOfValue', () => {
    it('returns 0 at min', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 10,
        step: 1,
        initialValue: 0,
      })
      expect(fractionOfValue(model)).toBe(0)
    })

    it('returns 1 at max', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 10,
        step: 1,
        initialValue: 10,
      })
      expect(fractionOfValue(model)).toBe(1)
    })

    it('returns 0.5 at midpoint', () => {
      const model = init({
        id: 'test',
        min: 0,
        max: 10,
        step: 1,
        initialValue: 5,
      })
      expect(fractionOfValue(model)).toBe(0.5)
    })

    it('handles a negative-min range', () => {
      const model = init({
        id: 'test',
        min: -10,
        max: 10,
        step: 1,
        initialValue: 0,
      })
      expect(fractionOfValue(model)).toBe(0.5)
    })

    it('returns 0 when min equals max', () => {
      const model = init({
        id: 'test',
        min: 5,
        max: 5,
        step: 1,
        initialValue: 5,
      })
      expect(fractionOfValue(model)).toBe(0)
    })
  })
})
