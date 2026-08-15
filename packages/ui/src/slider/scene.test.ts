import { Array } from 'effect'
import { inertHtml as ih } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import type { SliderAttributes } from './index.js'
import { PressedThumb, init, update, view } from './index.js'

const testToView = (attributes: SliderAttributes) =>
  ih.div(
    [...attributes.root],
    [
      ih.label([...attributes.label], ['Test']),
      ih.div([...attributes.track], [ih.div([...attributes.filledTrack])]),
      ih.div([...attributes.thumb]),
      ...(Array.isReadonlyArrayNonEmpty(attributes.hiddenInput)
        ? [ih.span(attributes.hiddenInput)]
        : []),
    ],
  )

const sceneView = Scene.withViewInputs(view, {
  value: 5,
  toView: testToView,
})

const defaultModel = init({
  id: 'test',
  min: 0,
  max: 10,
  step: 1,
})

const root = Scene.selector('[data-slider-id="test"]')
const track = Scene.selector('[data-slider-track-id="test"]')
const thumb = Scene.role('slider')
const hiddenInput = Scene.selector('[type="hidden"]')

describe('Slider', () => {
  describe('rendering', () => {
    it('renders the root with data-slider-id and data-orientation', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(defaultModel),
        Scene.expect(root).toExist(),
        Scene.expect(root).toHaveAttr('data-orientation', 'horizontal'),
      )
    })

    it('renders the track with the data-slider-track-id selector the pointer subscription relies on', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(defaultModel),
        Scene.expect(track).toExist(),
      )
    })

    it('renders the thumb with role=slider and aria value / orientation attributes', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(defaultModel),
        Scene.expect(thumb).toExist(),
        Scene.expect(thumb).toHaveAttr('aria-valuemin', '0'),
        Scene.expect(thumb).toHaveAttr('aria-valuemax', '10'),
        Scene.expect(thumb).toHaveAttr('aria-valuenow', '5'),
        Scene.expect(thumb).toHaveAttr('aria-orientation', 'horizontal'),
      )
    })
  })

  describe('thumb labeling', () => {
    it('falls back to aria-labelledby pointing at the label id', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-labelledby', 'test-label'),
      )
    })

    it('uses explicit ariaLabel when provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabel: 'Volume' }) },
        Scene.given(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-label', 'Volume'),
        Scene.expect(thumb).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('uses explicit ariaLabelledBy when provided, overriding the default', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabelledBy: 'external-label' }) },
        Scene.given(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-labelledby', 'external-label'),
      )
    })
  })

  describe('aria-valuetext', () => {
    it('is absent by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(defaultModel),
        Scene.expect(thumb).not.toHaveAttr('aria-valuetext'),
      )
    })

    it('announces the formatted string when formatValue is provided', () => {
      Scene.scene(
        {
          update,
          view: sceneView({ formatValue: value => `${value} of 10` }),
        },
        Scene.given(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-valuetext', '5 of 10'),
      )
    })
  })

  describe('state attributes', () => {
    it('marks the root, track, and thumb with data-dragging while Dragging', () => {
      const [draggingModel] = update(
        defaultModel,
        PressedThumb({ originValue: 5 }),
      )
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(draggingModel),
        Scene.expect(root).toHaveAttr('data-dragging', ''),
        Scene.expect(track).toHaveAttr('data-dragging', ''),
        Scene.expect(thumb).toHaveAttr('data-dragging', ''),
      )
    })

    it('marks disabled with aria-disabled and data-disabled', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.given(defaultModel),
        Scene.expect(root).toHaveAttr('data-disabled', ''),
        Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(thumb).toHaveAttr('data-disabled', ''),
      )
    })
  })

  describe('read-only', () => {
    it('marks the root, track, and thumb with data-readonly and the thumb with aria-readonly', () => {
      Scene.scene(
        { update, view: sceneView({ isReadOnly: true }) },
        Scene.given(defaultModel),
        Scene.expect(root).toHaveAttr('data-readonly', ''),
        Scene.expect(track).toHaveAttr('data-readonly', ''),
        Scene.expect(thumb).toHaveAttr('data-readonly', ''),
        Scene.expect(thumb).toHaveAttr('aria-readonly', 'true'),
        Scene.expect(thumb).not.toHaveAttr('aria-disabled'),
        Scene.expect(thumb).not.toHaveAttr('data-disabled'),
      )
    })

    it('emits both attribute sets when disabled and read-only are combined', () => {
      Scene.scene(
        {
          update,
          view: sceneView({ isDisabled: true, isReadOnly: true }),
        },
        Scene.given(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(thumb).toHaveAttr('data-disabled', ''),
        Scene.expect(thumb).toHaveAttr('aria-readonly', 'true'),
        Scene.expect(thumb).toHaveAttr('data-readonly', ''),
      )
    })

    it('drops the track and thumb pointer handlers when read-only', () => {
      Scene.scene(
        { update, view: sceneView({ isReadOnly: true }) },
        Scene.given(defaultModel),
        Scene.expect(track).not.toHaveHandler('pointerdown'),
        Scene.expect(thumb).not.toHaveHandler('pointerdown'),
      )
    })

    it('drops the keyboard handler when read-only', () => {
      Scene.scene(
        { update, view: sceneView({ isReadOnly: true }) },
        Scene.given(defaultModel),
        Scene.expect(thumb).not.toHaveHandler('keydown'),
      )
    })

    it('keeps the thumb focusable when read-only', () => {
      Scene.scene(
        { update, view: sceneView({ isReadOnly: true }) },
        Scene.given(defaultModel),
        Scene.expect(thumb).toHaveAttr('tabIndex', '0'),
      )
    })
  })

  describe('hidden input', () => {
    it('is absent when no name is provided', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(defaultModel),
        Scene.expect(hiddenInput).toBeAbsent(),
      )
    })

    it('renders with the name and current value when name is provided', () => {
      Scene.scene(
        { update, view: sceneView({ name: 'volume' }) },
        Scene.given(defaultModel),
        Scene.expect(hiddenInput).toExist(),
        Scene.expect(hiddenInput).toHaveAttr('name', 'volume'),
        Scene.expect(hiddenInput).toHaveAttr('value', '5'),
      )
    })
  })
})
