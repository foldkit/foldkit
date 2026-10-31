import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { Slider, SliderLive, type ViewInputs } from './slider.js'

type Overrides = Partial<Omit<ViewInputs, 'toView'>>

class SliderScene extends Block<SliderScene, Overrides>()('SliderScene', {
  Model: Schema.Struct({ slider: Slider }),
}) {}

const SliderSceneLive = SliderScene.make(
  Effect.fn(function* (_id, overrides) {
    const slider = yield* new Slider('slider', {
      id: 'test',
      min: 0,
      max: 10,
      step: 1,
    })

    return {
      model: { slider },
      view: (model, h) =>
        model.slider.view({
          value: 5,
          ...overrides,
          toView: attributes =>
            h.div(
              [...attributes.root],
              [
                h.label([...attributes.label], ['Test']),
                h.div(
                  [...attributes.track],
                  [h.div([...attributes.filledTrack])],
                ),
                h.div([...attributes.thumb]),
                ...(Array.isReadonlyArrayNonEmpty(attributes.hiddenInput)
                  ? [h.input(attributes.hiddenInput)]
                  : []),
              ],
            ),
        }),
    }
  }),
).pipe(Layer.provide(SliderLive))

const root = Scene.selector('[data-slider-id="test"]')
const track = Scene.selector('[data-slider-track-id="test"]')
const filledTrack = Scene.selector('[data-slider-track-id="test"] div')
const thumb = Scene.role('slider')
const hiddenInput = Scene.selector('[type="hidden"]')

describe('Slider', () => {
  describe('rendering', () => {
    it.effect('renders the root with data-slider-id and data-orientation', () =>
      Scene.scene(
        SliderSceneLive,
        {},
        Scene.expect(root).toExist(),
        Scene.expect(root).toHaveAttr('data-orientation', 'horizontal'),
      ),
    )

    it.effect(
      'renders the track with the data-slider-track-id selector the pointer subscription relies on',
      () => Scene.scene(SliderSceneLive, {}, Scene.expect(track).toExist()),
    )

    it.effect(
      'renders the thumb with role=slider and aria value / orientation attributes',
      () =>
        Scene.scene(
          SliderSceneLive,
          {},
          Scene.expect(thumb).toExist(),
          Scene.expect(thumb).toHaveAttr('aria-valuemin', '0'),
          Scene.expect(thumb).toHaveAttr('aria-valuemax', '10'),
          Scene.expect(thumb).toHaveAttr('aria-valuenow', '5'),
          Scene.expect(thumb).toHaveAttr('aria-orientation', 'horizontal'),
        ),
    )
  })

  describe('thumb labeling', () => {
    it.effect('falls back to aria-labelledby pointing at the label id', () =>
      Scene.scene(
        SliderSceneLive,
        {},
        Scene.expect(thumb).toHaveAttr('aria-labelledby', 'test-label'),
      ),
    )

    it.effect('uses explicit ariaLabel when provided', () =>
      Scene.scene(
        SliderSceneLive,
        { ariaLabel: 'Volume' },
        Scene.expect(thumb).toHaveAttr('aria-label', 'Volume'),
        Scene.expect(thumb).not.toHaveAttr('aria-labelledby'),
      ),
    )

    it.effect(
      'uses explicit ariaLabelledBy when provided, overriding the default',
      () =>
        Scene.scene(
          SliderSceneLive,
          { ariaLabelledBy: 'external-label' },
          Scene.expect(thumb).toHaveAttr('aria-labelledby', 'external-label'),
        ),
    )
  })

  describe('aria-valuetext', () => {
    it.effect('is absent by default', () =>
      Scene.scene(
        SliderSceneLive,
        {},
        Scene.expect(thumb).not.toHaveAttr('aria-valuetext'),
      ),
    )

    it.effect(
      'announces the formatted string when formatValue is provided',
      () =>
        Scene.scene(
          SliderSceneLive,
          { formatValue: value => `${value} of 10` },
          Scene.expect(thumb).toHaveAttr('aria-valuetext', '5 of 10'),
        ),
    )
  })

  describe('state attributes', () => {
    it.effect(
      'marks the root, track, and thumb with data-dragging while Dragging',
      () =>
        Scene.scene(
          SliderSceneLive,
          {},
          Scene.given({
            slider: {
              id: 'test',
              min: 0,
              max: 10,
              step: 1,
              dragState: { _tag: 'Dragging', originValue: 5 },
            },
          }),
          Scene.expect(root).toHaveAttr('data-dragging', ''),
          Scene.expect(track).toHaveAttr('data-dragging', ''),
          Scene.expect(thumb).toHaveAttr('data-dragging', ''),
        ),
    )

    it.effect('marks disabled with aria-disabled and data-disabled', () =>
      Scene.scene(
        SliderSceneLive,
        { isDisabled: true },
        Scene.expect(root).toHaveAttr('data-disabled', ''),
        Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(thumb).toHaveAttr('data-disabled', ''),
      ),
    )
  })

  describe('read-only', () => {
    it.effect(
      'marks the root, track, and thumb with data-readonly and the thumb with aria-readonly',
      () =>
        Scene.scene(
          SliderSceneLive,
          { isReadOnly: true },
          Scene.expect(root).toHaveAttr('data-readonly', ''),
          Scene.expect(track).toHaveAttr('data-readonly', ''),
          Scene.expect(thumb).toHaveAttr('data-readonly', ''),
          Scene.expect(thumb).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(thumb).not.toHaveAttr('aria-disabled'),
          Scene.expect(thumb).not.toHaveAttr('data-disabled'),
        ),
    )

    it.effect(
      'emits both attribute sets when disabled and read-only are combined',
      () =>
        Scene.scene(
          SliderSceneLive,
          { isDisabled: true, isReadOnly: true },
          Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
          Scene.expect(thumb).toHaveAttr('data-disabled', ''),
          Scene.expect(thumb).toHaveAttr('aria-readonly', 'true'),
          Scene.expect(thumb).toHaveAttr('data-readonly', ''),
        ),
    )

    it.effect('drops the track and thumb pointer handlers when read-only', () =>
      Scene.scene(
        SliderSceneLive,
        { isReadOnly: true },
        Scene.expect(track).not.toHaveHandler('pointerdown'),
        Scene.expect(thumb).not.toHaveHandler('pointerdown'),
      ),
    )

    it.effect('drops the keyboard handler when read-only', () =>
      Scene.scene(
        SliderSceneLive,
        { isReadOnly: true },
        Scene.expect(thumb).not.toHaveHandler('keydown'),
      ),
    )

    it.effect('keeps the thumb focusable when read-only', () =>
      Scene.scene(
        SliderSceneLive,
        { isReadOnly: true },
        Scene.expect(thumb).toHaveAttr('tabIndex', '0'),
      ),
    )
  })

  describe('vertical Slider geometry', () => {
    it.effect.each([
      { value: 0, bottom: '0%' },
      { value: 5, bottom: '50%' },
      { value: 10, bottom: '100%' },
    ])('positions the centered thumb at value $value', ({ value, bottom }) =>
      Scene.scene(
        SliderSceneLive,
        { orientation: 'Vertical', value },
        Scene.expect(thumb).toHaveStyle('bottom', bottom),
        Scene.expect(thumb).toHaveStyle('left', '50%'),
        Scene.expect(thumb).toHaveStyle(
          'transform',
          'translateX(-50%) translateY(50%)',
        ),
      ),
    )

    it.effect.each([
      { value: 0, bottom: 'calc((100% - 0.75rem) * 0)' },
      { value: 5, bottom: 'calc((100% - 0.75rem) * 0.5)' },
      { value: 10, bottom: 'calc((100% - 0.75rem) * 1)' },
    ])(
      'positions the edge-aligned thumb at value $value',
      ({ value, bottom }) =>
        Scene.scene(
          SliderSceneLive,
          {
            orientation: 'Vertical',
            thumbAlignment: 'Edge',
            value,
          },
          Scene.expect(thumb).toHaveStyle('bottom', bottom),
          Scene.expect(thumb).toHaveStyle('transform', 'translateX(-50%)'),
        ),
    )

    it.effect('uses thumbSize to position the edge-aligned thumb', () =>
      Scene.scene(
        SliderSceneLive,
        {
          orientation: 'Vertical',
          thumbAlignment: 'Edge',
          thumbSize: '1rem',
          value: 5,
        },
        Scene.expect(thumb).toHaveStyle('bottom', 'calc((100% - 1rem) * 0.5)'),
      ),
    )

    it.effect('sizes the edge-aligned fill to the thumb center', () =>
      Scene.scene(
        SliderSceneLive,
        {
          orientation: 'Vertical',
          thumbAlignment: 'Edge',
          value: 5,
        },
        Scene.expect(filledTrack).toHaveStyle(
          'height',
          'calc((100% - 0.75rem) * 0.5 + 0.75rem / 2)',
        ),
      ),
    )
  })

  describe('thumb alignment attributes', () => {
    it.effect(
      'marks the track with data-thumb-alignment="center" by default',
      () =>
        Scene.scene(
          SliderSceneLive,
          {},
          Scene.expect(track).toHaveAttr('data-thumb-alignment', 'center'),
        ),
    )

    it.effect(
      'marks the track with data-thumb-alignment="edge" for pointer mapping',
      () =>
        Scene.scene(
          SliderSceneLive,
          { thumbAlignment: 'Edge' },
          Scene.expect(track).toHaveAttr('data-thumb-alignment', 'edge'),
        ),
    )
  })

  describe('hidden input', () => {
    it.effect('is absent when no name is provided', () =>
      Scene.scene(SliderSceneLive, {}, Scene.expect(hiddenInput).toBeAbsent()),
    )

    it.effect(
      'renders with the name and current value when name is provided',
      () =>
        Scene.scene(
          SliderSceneLive,
          { name: 'volume' },
          Scene.expect(hiddenInput).toExist(),
          Scene.expect(hiddenInput).toHaveAttr('name', 'volume'),
          Scene.expect(hiddenInput).toHaveAttr('value', '5'),
        ),
    )
  })
})
