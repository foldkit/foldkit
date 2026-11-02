import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { HoverIntentBlock, layer } from './block.js'

const HoverIntentSceneKey = Symbol('HoverIntentScene')
const HoverIntentSceneDefinition = Block.makeDefinition('HoverIntentScene', {
  key: HoverIntentSceneKey,
  Init: Block.makeInputContract<readonly []>(),
  Model: Schema.Struct({ hoverIntent: HoverIntentBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element' },
})

const foldHoverIntentOutMessage = HoverIntentSceneDefinition.makeOutMessageFold(
  HoverIntentBlock,
  {
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  },
)

const HoverIntentBinding = HoverIntentSceneDefinition.makeBinding(
  HoverIntentBlock,
  {
    field: 'hoverIntent',
    init: { contextToArgs: () => [{}] },
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

const HoverIntentSceneComposition = HoverIntentSceneDefinition.makeComposition({
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

const HoverIntentSceneBlock = HoverIntentSceneDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* HoverIntentBinding
    return { children: [child], init, update, view: sceneView }
  }),
).provide(layer)

describe('HoverIntent', () => {
  describe('view', () => {
    it.effect('attaches hover, focus, and Escape handlers to the trigger', () =>
      Scene.scene(
        HoverIntentSceneBlock,
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
        HoverIntentSceneBlock,
        Scene.init(),
        Scene.expect(panel).toBeAbsent(),
      ),
    )

    it.effect('attaches the same interaction handlers to a visible panel', () =>
      Scene.scene(
        HoverIntentSceneBlock,
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
          HoverIntentSceneBlock,
          Scene.init(),
          Scene.focus(trigger),
          Scene.expect(panel).not.toHaveAttr('role'),
          Scene.expect(panel).not.toHaveAttr('aria-controls'),
          Scene.expect(panel).not.toHaveStyle('position', 'absolute'),
        ),
    )
  })
})
