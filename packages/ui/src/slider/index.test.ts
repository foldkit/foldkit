import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  type InitConfig,
  Slider,
  SliderLive,
  fractionOfValue,
  snapAndClamp,
  valueFromPointer,
} from './slider.js'

class SliderHarness extends Block<SliderHarness, InitConfig>()(
  'SliderHarness',
  {
    Model: Schema.Struct({ slider: Slider }),
    OutMessage: Slider.OutMessage,
  },
) {}

const SliderHarnessLive = SliderHarness.make(
  Effect.fn(function* (_id, config) {
    const slider = yield* new Slider('slider', config)

    return {
      model: { slider },
      update: {
        ...slider.on({
          ChangedValue: (model, outMessage) => ({ model, outMessage }),
        }),
      },
    }
  }),
).pipe(Layer.provide(SliderLive))

const withRange = (min: number, max: number, step: number): InitConfig => ({
  id: 'test',
  min,
  max,
  step,
})

const defaultModel = {
  slider: { id: 'test', min: 0, max: 10, step: 1, dragState: { _tag: 'Idle' } },
}

const deliverToSlider = (message: typeof Slider.Message.Type) =>
  Story.message(Block.deliver(Slider, 'slider', message))

describe('Slider', () => {
  describe('init', () => {
    it.effect('starts Idle with the configured range', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        Story.model(({ slider }) => {
          expect(slider.id).toBe('test')
          expect(slider.min).toBe(0)
          expect(slider.max).toBe(10)
          expect(slider.step).toBe(1)
          expect(slider.dragState._tag).toBe('Idle')
        }),
      ),
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
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'StepIncrement',
            value: 5,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 6 })),
      ),
    )

    it.effect('decrements by step on StepDecrement', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'StepDecrement',
            value: 5,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 4 })),
      ),
    )

    it.effect('increments by 10 steps on PageIncrement', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 100, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'PageIncrement',
            value: 20,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 30 })),
      ),
    )

    it.effect('decrements by 10 steps on PageDecrement', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 100, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'PageDecrement',
            value: 30,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 20 })),
      ),
    )

    it.effect('jumps to min on Min', () =>
      Story.story(
        SliderHarnessLive,
        withRange(2, 20, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'Min',
            value: 10,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 2 })),
      ),
    )

    it.effect('jumps to max on Max', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 99, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'Max',
            value: 10,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 99 })),
      ),
    )

    it.effect(
      'emits no OutMessage when a step increment is clamped to the same value',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.PressedKeyboardNavigation({
              direction: 'StepIncrement',
              value: 10,
            }),
          ),
          Story.expectNoOutMessage(),
        ),
    )

    it.effect(
      'emits no OutMessage when a step decrement is clamped to the same value',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.PressedKeyboardNavigation({
              direction: 'StepDecrement',
              value: 0,
            }),
          ),
          Story.expectNoOutMessage(),
        ),
    )

    it.effect('respects fractional step (0.1)', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 1, 0.1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'StepIncrement',
            value: 0.2,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 0.3 })),
      ),
    )
  })

  describe('thumb press', () => {
    it.effect('starts a drag without emitting an OutMessage', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(Slider.Message.PressedThumb({ originValue: 5 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.slider.dragState._tag).toBe('Dragging')
          if (model.slider.dragState._tag === 'Dragging') {
            expect(model.slider.dragState.originValue).toBe(5)
          }
        }),
      ),
    )

    it.effect(
      'ignores a bubbled PressedPointer after PressedThumb so the value is not shifted',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 1, 0.05),
          deliverToSlider(Slider.Message.PressedThumb({ originValue: 0.5 })),
          deliverToSlider(
            Slider.Message.PressedPointer({ value: 0.45, originValue: 0.5 }),
          ),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.slider.dragState._tag).toBe('Dragging')
            if (model.slider.dragState._tag === 'Dragging') {
              expect(model.slider.dragState.originValue).toBe(0.5)
            }
          }),
        ),
    )

    it.effect('is a no-op when already Dragging', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 9, originValue: 5 }),
        ),
        deliverToSlider(Slider.Message.PressedThumb({ originValue: 99 })),
        Story.model(model => {
          expect(model.slider.dragState._tag).toBe('Dragging')
          if (model.slider.dragState._tag === 'Dragging') {
            expect(model.slider.dragState.originValue).toBe(5)
          }
        }),
      ),
    )
  })

  describe('pointer drag', () => {
    it.effect('snaps value and starts a drag on track press', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 7, originValue: 5 }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 7 })),
        Story.model(model => {
          expect(model.slider.dragState._tag).toBe('Dragging')
          if (model.slider.dragState._tag === 'Dragging') {
            expect(model.slider.dragState.originValue).toBe(5)
          }
        }),
      ),
    )

    it.effect(
      'ignores PressedPointer while Dragging (absorbs the thumb→track bubble)',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.PressedPointer({ value: 7, originValue: 5 }),
          ),
          deliverToSlider(
            Slider.Message.PressedPointer({ value: 8, originValue: 7 }),
          ),
          Story.expectNoOutMessage(),
          Story.model(model => {
            expect(model.slider.dragState._tag).toBe('Dragging')
            if (model.slider.dragState._tag === 'Dragging') {
              expect(model.slider.dragState.originValue).toBe(5)
            }
          }),
        ),
    )

    it.effect('snaps PressedPointer value to step', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 2),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 4.7, originValue: 0 }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 4 })),
      ),
    )

    it.effect(
      'emits the snapped value on MovedDragPointer while Dragging',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.PressedPointer({ value: 3, originValue: 5 }),
          ),
          deliverToSlider(Slider.Message.MovedDragPointer({ value: 8 })),
          Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 8 })),
          Story.model(model => {
            expect(model.slider.dragState._tag).toBe('Dragging')
          }),
        ),
    )

    it.effect('ignores MovedDragPointer when Idle', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(Slider.Message.MovedDragPointer({ value: 8 })),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model).toEqual(defaultModel)
        }),
      ),
    )

    it.effect('transitions from Dragging to Idle on ReleasedDragPointer', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 3, originValue: 5 }),
        ),
        deliverToSlider(Slider.Message.ReleasedDragPointer()),
        Story.expectNoOutMessage(),
        Story.model(model => {
          expect(model.slider.dragState._tag).toBe('Idle')
        }),
      ),
    )

    it.effect('ignores ReleasedDragPointer when Idle', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(Slider.Message.ReleasedDragPointer()),
        Story.model(model => {
          expect(model).toEqual(defaultModel)
        }),
      ),
    )

    it.effect('emits the origin value on CancelledDrag while Dragging', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 9, originValue: 5 }),
        ),
        deliverToSlider(Slider.Message.MovedDragPointer({ value: 2 })),
        deliverToSlider(Slider.Message.CancelledDrag()),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 5 })),
        Story.model(model => {
          expect(model.slider.dragState._tag).toBe('Idle')
        }),
      ),
    )

    it.effect(
      'emits the origin value on CancelledDrag after PressedThumb',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(Slider.Message.PressedThumb({ originValue: 5 })),
          deliverToSlider(Slider.Message.MovedDragPointer({ value: 9 })),
          deliverToSlider(Slider.Message.CancelledDrag()),
          Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 5 })),
          Story.model(model => {
            expect(model.slider.dragState._tag).toBe('Idle')
          }),
        ),
    )

    it.effect('ignores CancelledDrag when Idle', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(Slider.Message.CancelledDrag()),
        Story.model(model => {
          expect(model).toEqual(defaultModel)
        }),
      ),
    )

    it.effect('clamps MovedDragPointer above max', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 5, originValue: 5 }),
        ),
        deliverToSlider(Slider.Message.MovedDragPointer({ value: 42 })),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 10 })),
      ),
    )

    it.effect('clamps MovedDragPointer below min', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 5, originValue: 5 }),
        ),
        deliverToSlider(Slider.Message.MovedDragPointer({ value: -4 })),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 0 })),
      ),
    )
  })

  describe('OutMessage', () => {
    it.effect('emits ChangedValue on StepIncrement when value changes', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedKeyboardNavigation({
            direction: 'StepIncrement',
            value: 5,
          }),
        ),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 6 })),
      ),
    )

    it.effect('emits ChangedValue when restoring origin on CancelledDrag', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.PressedPointer({ value: 9, originValue: 5 }),
        ),
        deliverToSlider(Slider.Message.CancelledDrag()),
        Story.expectOutMessage(Slider.OutMessage.ChangedValue({ value: 5 })),
      ),
    )

    it.effect(
      'emits no OutMessage on ReleasedDragPointer (value already set during drag)',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.PressedPointer({ value: 3, originValue: 5 }),
          ),
          deliverToSlider(Slider.Message.ReleasedDragPointer()),
          Story.expectNoOutMessage(),
        ),
    )

    it.effect(
      'emits no OutMessage when PressedPointer snaps to the current value',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.PressedPointer({ value: 5, originValue: 5 }),
          ),
          Story.expectNoOutMessage(),
        ),
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

  describe('informRangeChanged', () => {
    it.effect('updates min and max', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(
          Slider.Message.InformedOfRangeChange({ min: 100, max: 200 }),
        ),
        Story.model(({ slider }) => {
          expect(slider.min).toBe(100)
          expect(slider.max).toBe(200)
        }),
      ),
    )

    it.effect(
      'handles the informed range fact without emitting a value change',
      () =>
        Story.story(
          SliderHarnessLive,
          withRange(0, 10, 1),
          deliverToSlider(
            Slider.Message.InformedOfRangeChange({ min: 0, max: 50 }),
          ),
          Story.expectNoOutMessage(),
          Story.Command.expectNone(),
          Story.model(({ slider }) => {
            expect(slider.min).toBe(0)
            expect(slider.max).toBe(50)
          }),
        ),
    )

    it.effect('updates the range even while Dragging', () =>
      Story.story(
        SliderHarnessLive,
        withRange(0, 10, 1),
        deliverToSlider(Slider.Message.PressedThumb({ originValue: 5 })),
        Story.model(({ slider }) => {
          expect(slider.dragState._tag).toBe('Dragging')
        }),
        deliverToSlider(
          Slider.Message.InformedOfRangeChange({ min: 7, max: 10 }),
        ),
        Story.model(({ slider }) => {
          expect(slider.min).toBe(7)
          expect(slider.max).toBe(10)
          expect(slider.dragState._tag).toBe('Dragging')
        }),
      ),
    )
  })
})
