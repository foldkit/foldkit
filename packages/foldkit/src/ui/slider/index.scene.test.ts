import { describe, it } from '@effect/vitest'

import { html } from '../../html/index.js'
import * as Scene from '../../test/scene.js'
import type { Message, Model, ViewConfig } from './index.js'
import { PressedThumb, init, update, view } from './index.js'

const { div, label, span } = html<Message>()

const sceneView =
  (
    overrides: Omit<
      Partial<ViewConfig<Message>>,
      'model' | 'toParentMessage'
    > = {},
  ) =>
  (model: Model) =>
    view({
      toView: attributes =>
        div(
          [...attributes.root],
          [
            label([...attributes.label], ['Test']),
            div([...attributes.track], [div([...attributes.filledTrack], [])]),
            div([...attributes.thumb], []),
            ...(attributes.hiddenInput.length > 0
              ? [span(attributes.hiddenInput, [])]
              : []),
          ],
        ),
      ...overrides,
      model,
      toParentMessage: message => message,
    })

const defaultModel = init({
  id: 'test',
  min: 0,
  max: 10,
  step: 1,
  initialValue: 5,
})

const root = Scene.selector('[data-slider-id="test"]')
const track = Scene.selector('[data-slider-track-id="test"]')
const thumb = Scene.getByRole('slider')
const hiddenInput = Scene.selector('[type="hidden"]')

describe('Slider scene', () => {
  describe('rendering', () => {
    it('renders the root with data-slider-id and data-orientation', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(defaultModel),
        Scene.expect(root).toExist(),
        Scene.expect(root).toHaveAttr('data-orientation', 'horizontal'),
      )
    })

    it('renders the track with the data-slider-track-id selector the pointer subscription relies on', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(defaultModel),
        Scene.expect(track).toExist(),
      )
    })

    it('renders the thumb with role=slider and aria value / orientation attributes', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(defaultModel),
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
        Scene.with(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-labelledby', 'test-label'),
      )
    })

    it('uses explicit ariaLabel when provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabel: 'Volume' }) },
        Scene.with(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-label', 'Volume'),
        Scene.expect(thumb).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('uses explicit ariaLabelledBy when provided, overriding the default', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabelledBy: 'external-label' }) },
        Scene.with(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-labelledby', 'external-label'),
      )
    })
  })

  describe('aria-valuetext', () => {
    it('is absent by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(defaultModel),
        Scene.expect(thumb).not.toHaveAttr('aria-valuetext'),
      )
    })

    it('announces the formatted string when formatValue is provided', () => {
      Scene.scene(
        {
          update,
          view: sceneView({ formatValue: value => `${value} of 10` }),
        },
        Scene.with(defaultModel),
        Scene.expect(thumb).toHaveAttr('aria-valuetext', '5 of 10'),
      )
    })
  })

  describe('state attributes', () => {
    it('marks the root, track, and thumb with data-dragging while Dragging', () => {
      const [draggingModel] = update(defaultModel, PressedThumb())
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(draggingModel),
        Scene.expect(root).toHaveAttr('data-dragging', ''),
        Scene.expect(track).toHaveAttr('data-dragging', ''),
        Scene.expect(thumb).toHaveAttr('data-dragging', ''),
      )
    })

    it('marks disabled with aria-disabled and data-disabled', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.with(defaultModel),
        Scene.expect(root).toHaveAttr('data-disabled', ''),
        Scene.expect(thumb).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(thumb).toHaveAttr('data-disabled', ''),
      )
    })
  })

  describe('hidden input', () => {
    it('is absent when no name is provided', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(defaultModel),
        Scene.expect(hiddenInput).toBeAbsent(),
      )
    })

    it('renders with the name and current value when name is provided', () => {
      Scene.scene(
        { update, view: sceneView({ name: 'volume' }) },
        Scene.with(defaultModel),
        Scene.expect(hiddenInput).toExist(),
        Scene.expect(hiddenInput).toHaveAttr('name', 'volume'),
        Scene.expect(hiddenInput).toHaveAttr('value', '5'),
      )
    })
  })
})
