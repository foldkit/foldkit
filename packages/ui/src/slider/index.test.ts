import { Effect } from 'effect'
import * as Story from 'foldkit/story'
import { it as baseIt, expect } from 'vitest'

import { describe, makeMethods } from '@effect/vitest'

import {
  InMessage,
  Message,
  OutMessage,
  SliderBlock as block,
  fractionOfValue,
  layer,
  snapAndClamp,
  valueFromPointer,
} from './slider.js'

type SliderOperations = Pick<
  Story.TestBlock<typeof block>,
  'init' | 'update' | 'inMessageUpdate' | 'operations'
>
const makeFixture = ({
  init,
  update,
  inMessageUpdate,
  operations,
}: SliderOperations) => {
  const defaultInit = () => init({ id: 'test', min: 0, max: 10, step: 1 }).model

  return { init, update, inMessageUpdate, operations, defaultInit }
}
const it = makeMethods(
  baseIt.extend<{ slider: ReturnType<typeof makeFixture> }>({
    slider: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(block, slider =>
          Effect.promise(() => use(makeFixture(slider))),
        ).pipe(Effect.provide(layer)),
      ),
  }),
)

describe('Slider', () => {
  describe('init', () => {
    it.effect('starts Idle with the configured range', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.model(model => {
          expect(model.id).toBe('test')
          expect(model.min).toBe(0)
          expect(model.max).toBe(10)
          expect(model.step).toBe(1)
          expect(model.dragState._tag).toBe('Idle')
        }),
      ).pipe(Effect.provide(layer)),
    )
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
    it.effect('increments by step on StepIncrement', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'StepIncrement',
            value: 5,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 6 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('decrements by step on StepDecrement', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'StepDecrement',
            value: 5,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 4 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('increments by 10 steps on PageIncrement', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 100, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'PageIncrement',
            value: 20,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 30 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('decrements by 10 steps on PageDecrement', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 100, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'PageDecrement',
            value: 30,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 20 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('jumps to min on Min', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 2, max: 20, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'Min',
            value: 10,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 2 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('jumps to max on Max', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 99, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'Max',
            value: 10,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 99 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits no OutMessage when a step increment is clamped to the same value',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(
            Message.PressedKeyboardNavigation({
              direction: 'StepIncrement',
              value: 10,
            }),
          ),
          Story.expectNoOutMessage(),
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits no OutMessage when a step decrement is clamped to the same value',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(
            Message.PressedKeyboardNavigation({
              direction: 'StepDecrement',
              value: 0,
            }),
          ),
          Story.expectNoOutMessage(),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('respects fractional step (0.1)', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 1, step: 0.1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'StepIncrement',
            value: 0.2,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 0.3 })),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('thumb press', () => {
    it.effect('starts a drag without emitting an OutMessage', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedThumb({ originValue: 5 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'ignores a bubbled PressedPointer after PressedThumb so the value is not shifted',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 1, step: 0.05 }),
          Story.message(Message.PressedThumb({ originValue: 0.5 })),
          Story.message(
            Message.PressedPointer({ value: 0.45, originValue: 0.5 }),
          ),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Dragging')
            if (model.dragState._tag === 'Dragging') {
              expect(model.dragState.originValue).toBe(0.5)
            }
          }),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('is a no-op when already Dragging', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 9, originValue: 5 })),
        Story.message(Message.PressedThumb({ originValue: 99 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('pointer drag', () => {
    it.effect('snaps value and starts a drag on track press', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 7, originValue: 5 })),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 7 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Dragging')
          if (model.dragState._tag === 'Dragging') {
            expect(model.dragState.originValue).toBe(5)
          }
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'ignores PressedPointer while Dragging (absorbs the thumb→track bubble)',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(Message.PressedPointer({ value: 7, originValue: 5 })),
          Story.message(Message.PressedPointer({ value: 8, originValue: 7 })),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Dragging')
            if (model.dragState._tag === 'Dragging') {
              expect(model.dragState.originValue).toBe(5)
            }
          }),
        ).pipe(Effect.provide(layer)),
    )

    it.effect('snaps PressedPointer value to step', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 2 }),
        Story.message(Message.PressedPointer({ value: 4.7, originValue: 0 })),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 4 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits the snapped value on MovedDragPointer while Dragging',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(Message.PressedPointer({ value: 3, originValue: 5 })),
          Story.message(Message.MovedDragPointer({ value: 8 })),
          Story.expectOutMessage(OutMessage.ChangedValue({ value: 8 })),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Dragging')
          }),
        ).pipe(Effect.provide(layer)),
    )

    it('ignores MovedDragPointer when Idle', ({
      slider: { defaultInit, update },
    }) => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.given(originalModel),
        Story.message(Message.MovedDragPointer({ value: 8 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it.effect('transitions from Dragging to Idle on ReleasedDragPointer', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 3, originValue: 5 })),
        Story.message(Message.ReleasedDragPointer()),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it('ignores ReleasedDragPointer when Idle', ({
      slider: { defaultInit, update },
    }) => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.given(originalModel),
        Story.message(Message.ReleasedDragPointer()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it.effect('emits the origin value on CancelledDrag while Dragging', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 9, originValue: 5 })),
        Story.message(Message.MovedDragPointer({ value: 2 })),
        Story.message(Message.CancelledDrag()),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 5 })),
        Story.model(model => {
          expect(model.dragState._tag).toBe('Idle')
        }),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits the origin value on CancelledDrag after PressedThumb',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(Message.PressedThumb({ originValue: 5 })),
          Story.message(Message.MovedDragPointer({ value: 9 })),
          Story.message(Message.CancelledDrag()),
          Story.expectOutMessage(OutMessage.ChangedValue({ value: 5 })),
          Story.model(model => {
            expect(model.dragState._tag).toBe('Idle')
          }),
        ).pipe(Effect.provide(layer)),
    )

    it('ignores CancelledDrag when Idle', ({
      slider: { defaultInit, update },
    }) => {
      const originalModel = defaultInit()
      Story.story(
        update,
        Story.given(originalModel),
        Story.message(Message.CancelledDrag()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })

    it.effect('clamps MovedDragPointer above max', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 5, originValue: 5 })),
        Story.message(Message.MovedDragPointer({ value: 42 })),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 10 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('clamps MovedDragPointer below min', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 5, originValue: 5 })),
        Story.message(Message.MovedDragPointer({ value: -4 })),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 0 })),
      ).pipe(Effect.provide(layer)),
    )
  })

  describe('OutMessage', () => {
    it.effect('emits ChangedValue on StepIncrement when value changes', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(
          Message.PressedKeyboardNavigation({
            direction: 'StepIncrement',
            value: 5,
          }),
        ),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 6 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect('emits ChangedValue when restoring origin on CancelledDrag', () =>
      Story.story(
        block,
        Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
        Story.message(Message.PressedPointer({ value: 9, originValue: 5 })),
        Story.message(Message.CancelledDrag()),
        Story.expectOutMessage(OutMessage.ChangedValue({ value: 5 })),
      ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits no OutMessage on ReleasedDragPointer (value already set during drag)',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(Message.PressedPointer({ value: 3, originValue: 5 })),
          Story.message(Message.ReleasedDragPointer()),
          Story.expectNoOutMessage(),
        ).pipe(Effect.provide(layer)),
    )

    it.effect(
      'emits no OutMessage when PressedPointer snaps to the current value',
      () =>
        Story.story(
          block,
          Story.init({ id: 'test', min: 0, max: 10, step: 1 }),
          Story.message(Message.PressedPointer({ value: 5, originValue: 5 })),
          Story.expectNoOutMessage(),
        ).pipe(Effect.provide(layer)),
    )
  })

  describe('valueFromPointer', () => {
    const stubBoundingClientRect = (
      element: Element,
      boundingRect: {
        left: number
        top: number
        width: number
        height: number
      },
    ): void => {
      element.getBoundingClientRect = (): DOMRect => ({
        left: boundingRect.left,
        top: boundingRect.top,
        width: boundingRect.width,
        height: boundingRect.height,
        right: boundingRect.left + boundingRect.width,
        bottom: boundingRect.top + boundingRect.height,
        x: boundingRect.left,
        y: boundingRect.top,
        toJSON: () => ({}),
      })
    }

    it('maps horizontal pointer position on the X axis', () => {
      const track = document.createElement('div')
      track.setAttribute('data-orientation', 'horizontal')
      track.setAttribute('data-horizontal', '')
      stubBoundingClientRect(track, {
        left: 0,
        top: 0,
        width: 200,
        height: 20,
      })

      expect(valueFromPointer(50, 10, track, 0, 10)).toBe(2.5)
    })

    it('maps vertical pointer position on the inverted Y axis', () => {
      const track = document.createElement('div')
      track.setAttribute('data-orientation', 'vertical')
      track.setAttribute('data-vertical', '')
      stubBoundingClientRect(track, {
        left: 0,
        top: 0,
        width: 20,
        height: 200,
      })

      expect(valueFromPointer(10, 50, track, 0, 10)).toBe(7.5)
    })

    it("reads the track's own orientation when nested inside an oppositely oriented Slider", () => {
      const verticalAncestor = document.createElement('div')
      verticalAncestor.setAttribute('data-vertical', '')

      const track = document.createElement('div')
      track.setAttribute('data-orientation', 'horizontal')
      track.setAttribute('data-horizontal', '')
      verticalAncestor.appendChild(track)
      stubBoundingClientRect(track, {
        left: 0,
        top: 0,
        width: 200,
        height: 20,
      })

      expect(valueFromPointer(50, 10, track, 0, 10)).toBe(2.5)
    })

    it("maps horizontal pointers across the edge-aligned thumb's inset travel", () => {
      const sliderRoot = document.createElement('div')
      sliderRoot.setAttribute('data-slider-id', 'edge-horizontal')

      const track = document.createElement('div')
      track.setAttribute('data-slider-track-id', 'edge-horizontal')
      track.setAttribute('data-orientation', 'horizontal')
      track.setAttribute('data-thumb-alignment', 'edge')
      stubBoundingClientRect(track, {
        left: 0,
        top: 0,
        width: 200,
        height: 20,
      })

      const thumb = document.createElement('div')
      thumb.id = 'edge-horizontal-thumb'
      stubBoundingClientRect(thumb, {
        left: 0,
        top: 0,
        width: 20,
        height: 20,
      })

      sliderRoot.appendChild(track)
      sliderRoot.appendChild(thumb)
      document.body.appendChild(sliderRoot)

      try {
        expect(valueFromPointer(10, 10, track, 0, 100)).toBe(0)
        expect(valueFromPointer(100, 10, track, 0, 100)).toBe(50)
        expect(valueFromPointer(190, 10, track, 0, 100)).toBe(100)
        expect(valueFromPointer(0, 10, track, 0, 100)).toBe(0)
        expect(valueFromPointer(200, 10, track, 0, 100)).toBe(100)
      } finally {
        sliderRoot.remove()
      }
    })

    it("maps vertical pointers across the edge-aligned thumb's inverted inset travel", () => {
      const track = document.createElement('div')
      track.setAttribute('data-slider-track-id', 'edge-vertical')
      track.setAttribute('data-orientation', 'vertical')
      track.setAttribute('data-thumb-alignment', 'edge')
      stubBoundingClientRect(track, {
        left: 0,
        top: 0,
        width: 20,
        height: 200,
      })

      const thumb = document.createElement('div')
      thumb.id = 'edge-vertical-thumb'
      stubBoundingClientRect(thumb, {
        left: 0,
        top: 0,
        width: 20,
        height: 20,
      })

      document.body.appendChild(track)
      document.body.appendChild(thumb)

      try {
        expect(valueFromPointer(10, 190, track, 0, 100)).toBe(0)
        expect(valueFromPointer(10, 100, track, 0, 100)).toBe(50)
        expect(valueFromPointer(10, 10, track, 0, 100)).toBe(100)
        expect(valueFromPointer(10, 200, track, 0, 100)).toBe(0)
        expect(valueFromPointer(10, 0, track, 0, 100)).toBe(100)
      } finally {
        track.remove()
        thumb.remove()
      }
    })

    it('uses the full track when the edge-aligned thumb is absent', () => {
      const track = document.createElement('div')
      track.setAttribute('data-slider-track-id', 'edge-without-thumb')
      track.setAttribute('data-orientation', 'horizontal')
      track.setAttribute('data-thumb-alignment', 'edge')
      stubBoundingClientRect(track, {
        left: 0,
        top: 0,
        width: 200,
        height: 20,
      })

      expect(valueFromPointer(0, 10, track, 0, 100)).toBe(0)
      expect(valueFromPointer(100, 10, track, 0, 100)).toBe(50)
      expect(valueFromPointer(200, 10, track, 0, 100)).toBe(100)
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

  describe('informOfRangeChange', () => {
    it('updates min and max', ({ slider: { defaultInit, operations } }) => {
      const before = defaultInit()
      const after = operations.informOfRangeChange(before, {
        min: 100,
        max: 200,
      })
      expect(after.model.min).toBe(100)
      expect(after.model.max).toBe(200)
    })

    it('handles the informed range fact without emitting a value change', ({
      slider: { inMessageUpdate, defaultInit },
    }) => {
      const after = inMessageUpdate(
        defaultInit(),
        InMessage.InformedOfRangeChange({ min: 0, max: 50 }),
      )
      expect(after.outMessage).toBeUndefined()
      expect(after.commands).toBeUndefined()
      expect(after.model.min).toBe(0)
      expect(after.model.max).toBe(50)
    })

    it('updates the range even while Dragging', ({
      slider: { update, defaultInit, operations },
    }) => {
      const dragStart = update(
        defaultInit(),
        Message.PressedThumb({ originValue: 5 }),
      )
      expect(dragStart.model.dragState._tag).toBe('Dragging')

      const after = operations.informOfRangeChange(dragStart.model, {
        min: 7,
        max: 10,
      })
      expect(after.model.min).toBe(7)
      expect(after.model.max).toBe(10)
      expect(after.model.dragState._tag).toBe('Dragging')
    })
  })
})
