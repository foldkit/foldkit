import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { expect, focus, scene, selector } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { HoverIntent, HoverIntentLive } from './block.js'

class HoverIntentScene extends Block<HoverIntentScene>()('HoverIntentScene', {
  Model: Schema.Struct({ hoverIntent: HoverIntent }),
}) {}

const HoverIntentSceneLive = HoverIntentScene.make(
  Effect.fn(function* () {
    const hoverIntent = yield* new HoverIntent('hoverIntent', {})

    return {
      model: { hoverIntent },
      view: (model, h) =>
        model.hoverIntent.view({
          toView: ({ trigger, panel, isVisible }) =>
            h.div(
              [],
              [
                h.button([h.Id('trigger'), ...trigger], ['Preview']),
                ...(isVisible
                  ? [h.div([h.Id('panel'), ...panel], ['Content'])]
                  : []),
              ],
            ),
        }),
    }
  }),
).pipe(Layer.provide(HoverIntentLive))

const trigger = selector('#trigger')
const panel = selector('#panel')

describe('HoverIntent', () => {
  describe('view', () => {
    it.effect('attaches hover, focus, and Escape handlers to the trigger', () =>
      scene(
        HoverIntentSceneLive,
        expect(trigger).toHaveHandler('mouseenter'),
        expect(trigger).toHaveHandler('mouseleave'),
        expect(trigger).toHaveHandler('focus'),
        expect(trigger).toHaveHandler('blur'),
        expect(trigger).toHaveHandler('keydown'),
      ),
    )

    it.effect('leaves panel markup to the consumer while hidden', () =>
      scene(HoverIntentSceneLive, expect(panel).toBeAbsent()),
    )

    it.effect('attaches the same interaction handlers to a visible panel', () =>
      scene(
        HoverIntentSceneLive,
        focus(trigger),
        expect(panel).toHaveHandler('mouseenter'),
        expect(panel).toHaveHandler('mouseleave'),
        expect(panel).toHaveHandler('focusin'),
        expect(panel).toHaveHandler('focusout'),
        expect(panel).toHaveHandler('keydown'),
      ),
    )

    it.effect(
      'does not impose a role, ARIA attribute, or positioning style',
      () =>
        scene(
          HoverIntentSceneLive,
          focus(trigger),
          expect(panel).not.toHaveAttr('role'),
          expect(panel).not.toHaveAttr('aria-controls'),
          expect(panel).not.toHaveStyle('position', 'absolute'),
        ),
    )
  })
})
