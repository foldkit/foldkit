import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { HoverIntentBlock, layer } from './block.js'

const HoverIntentSceneKey = Symbol('HoverIntentScene')
const HoverIntentSceneBlock = Block.make('HoverIntentScene', {
  key: HoverIntentSceneKey,
  InitArgs: Block.makeInputContract<readonly []>(),
  Model: Schema.Struct({ hoverIntent: HoverIntentBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
})

const foldHoverIntentOutMessage = HoverIntentSceneBlock.makeOutMessageFold(
  HoverIntentBlock,
  {
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  },
)

const HoverIntentBinding = HoverIntentSceneBlock.makeRequiredFieldBinding(
  HoverIntentBlock,
  {
    field: 'hoverIntent',
    init: { contextToArgs: () => [{}] },
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

const HoverIntentSceneComposition = HoverIntentSceneBlock.makeComposition({
  bindings: [HoverIntentBinding],
})

const init = HoverIntentSceneComposition.makeInit(() => ({ model: {} }))
const update = HoverIntentSceneComposition.makeUpdate({})

const sceneView = HoverIntentSceneComposition.makeView((model, h) =>
  h.block(
    HoverIntentBinding.embedView({
      slotId: 'hover-intent',
      model: model.hoverIntent,
      viewInputs: {
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
      },
    }),
  ),
)

const trigger = Scene.selector('#trigger')
const panel = Scene.selector('#panel')

const hoverIntentScene = {
  block: HoverIntentSceneBlock,
  layer: HoverIntentSceneBlock.makeLayer({
    init,
    update,
    view: sceneView,
  }).pipe(Layer.provide(layer)),
}

describe('HoverIntent', () => {
  describe('view', () => {
    it.effect('attaches hover, focus, and Escape handlers to the trigger', () =>
      Scene.scene(
        hoverIntentScene,
        Scene.init(),
        Scene.expect(trigger).toHaveHandler('mouseenter'),
        Scene.expect(trigger).toHaveHandler('mouseleave'),
        Scene.expect(trigger).toHaveHandler('focus'),
        Scene.expect(trigger).toHaveHandler('blur'),
        Scene.expect(trigger).toHaveHandler('keydown'),
      ),
    )

    it.effect('leaves panel markup to the consumer while hidden', () =>
      Scene.scene(
        hoverIntentScene,
        Scene.init(),
        Scene.expect(panel).toBeAbsent(),
      ),
    )

    it.effect('attaches the same interaction handlers to a visible panel', () =>
      Scene.scene(
        hoverIntentScene,
        Scene.init(),
        Scene.focus(trigger),
        Scene.expect(panel).toHaveHandler('mouseenter'),
        Scene.expect(panel).toHaveHandler('mouseleave'),
        Scene.expect(panel).toHaveHandler('focusin'),
        Scene.expect(panel).toHaveHandler('focusout'),
        Scene.expect(panel).toHaveHandler('keydown'),
      ),
    )

    it.effect(
      'does not impose a role, ARIA attribute, or positioning style',
      () =>
        Scene.scene(
          hoverIntentScene,
          Scene.init(),
          Scene.focus(trigger),
          Scene.expect(panel).not.toHaveAttr('role'),
          Scene.expect(panel).not.toHaveAttr('aria-controls'),
          Scene.expect(panel).not.toHaveStyle('position', 'absolute'),
        ),
    )
  })
})
