import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Mount,
  focus,
  scene,
  expect as sceneExpect,
  selector,
} from 'foldkit/scene'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  AnchorTooltip,
  Tooltip,
  TooltipLive,
  type ViewInputs,
  triggerId,
} from './block.js'
import { Message } from './message.js'

type Overrides = Omit<ViewInputs, 'anchor' | 'toView'>

class TooltipScene extends Block<TooltipScene, Overrides>()('TooltipScene', {
  Model: Schema.Struct({ tooltip: Tooltip }),
}) {}

const TooltipSceneLive = TooltipScene.make(
  Effect.fn(function* (_id, overrides) {
    const tooltip = yield* new Tooltip('tooltip', { id: 'test' })

    return {
      model: { tooltip },
      view: (model, h) =>
        model.tooltip.view({
          anchor: { placement: 'top' },
          ...overrides,
          toView: ({ trigger, panel, isVisible }) =>
            h.div(
              [],
              [
                h.button([...trigger]),
                ...(isVisible ? [h.div([...panel])] : []),
              ],
            ),
        }),
    }
  }),
).pipe(Layer.provide(TooltipLive))

const acknowledgeAnchor = Mount.resolve(
  AnchorTooltip,
  Message.CompletedAnchorTooltip(),
)

const trigger = selector('#test-trigger')
const panel = selector('#test-panel')

describe('Tooltip', () => {
  describe('view', () => {
    it.effect(
      'renders the trigger with aria-describedby and no data-open when hidden',
      () =>
        scene(
          TooltipSceneLive,
          {},
          sceneExpect(trigger).toHaveAttr('aria-describedby', 'test-panel'),
          sceneExpect(trigger).not.toHaveAttr('data-open'),
        ),
    )

    it.effect('does not render the panel when hidden', () =>
      scene(TooltipSceneLive, {}, sceneExpect(panel).toBeAbsent()),
    )

    it.effect('renders the panel with role=tooltip when open', () =>
      scene(
        TooltipSceneLive,
        {},
        focus(trigger),
        sceneExpect(panel).toExist(),
        sceneExpect(panel).toHaveAttr('role', 'tooltip'),
        sceneExpect(panel).toHaveAttr('id', 'test-panel'),
        acknowledgeAnchor,
      ),
    )

    it.effect('marks the trigger with data-open when visible', () =>
      scene(
        TooltipSceneLive,
        {},
        focus(trigger),
        sceneExpect(trigger).toHaveAttr('data-open', ''),
        acknowledgeAnchor,
      ),
    )

    it.effect('adds anchor positioning styles and hooks to the panel', () =>
      scene(
        TooltipSceneLive,
        {},
        focus(trigger),
        sceneExpect(panel).toHaveStyle('position', 'absolute'),
        sceneExpect(panel).toHaveStyle('margin', '0'),
        sceneExpect(panel).toHaveStyle('visibility', 'hidden'),
        sceneExpect(panel).toHaveStyle('pointerEvents', 'none'),
        sceneExpect(panel).toHaveHook('insert'),
        sceneExpect(panel).toHaveHook('destroy'),
        acknowledgeAnchor,
      ),
    )

    it.effect('does not attach interaction handlers when disabled', () =>
      scene(
        TooltipSceneLive,
        { isDisabled: true },
        sceneExpect(trigger).toHaveAttr('aria-disabled', 'true'),
        sceneExpect(trigger).toHaveAttr('data-disabled', ''),
        sceneExpect(trigger).not.toHaveHandler('mouseenter'),
        sceneExpect(trigger).not.toHaveHandler('focus'),
      ),
    )
  })

  describe('trigger labeling', () => {
    it.effect(
      'no aria-label or aria-labelledby on the trigger by default',
      () =>
        scene(
          TooltipSceneLive,
          {},
          sceneExpect(trigger).not.toHaveAttr('aria-label'),
          sceneExpect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-label to the trigger when ariaLabel is provided',
      () =>
        scene(
          TooltipSceneLive,
          { ariaLabel: 'More info' },
          sceneExpect(trigger).toHaveAttr('aria-label', 'More info'),
          sceneExpect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-labelledby to the trigger when ariaLabelledBy is provided',
      () =>
        scene(
          TooltipSceneLive,
          { ariaLabelledBy: 'info-label' },
          sceneExpect(trigger).toHaveAttr('aria-labelledby', 'info-label'),
          sceneExpect(trigger).not.toHaveAttr('aria-label'),
        ),
    )

    it.effect(
      'prefers aria-label over aria-labelledby when both are provided',
      () =>
        scene(
          TooltipSceneLive,
          { ariaLabel: 'More info', ariaLabelledBy: 'info-label' },
          sceneExpect(trigger).toHaveAttr('aria-label', 'More info'),
          sceneExpect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it('triggerId derives the trigger id from the base id', () => {
      expect(triggerId('test')).toBe('test-trigger')
    })
  })
})
