import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { HoverIntentBlock, Model } from './block.js'
import { Message } from './message.js'

const HoverIntentSceneDefinition = Block.makeDefinition('HoverIntentScene', {
  Model,
  Message: Schema.Never,
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
    read: model => Option.some(model),
    write: (_model, nextHoverIntent) => nextHoverIntent,
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

const HoverIntentSceneComposition = HoverIntentSceneDefinition.makeComposition({
  bindings: [HoverIntentBinding],
})

const update = HoverIntentSceneComposition.makeUpdate({})

const sceneView = HoverIntentSceneComposition.makeView((model, h) =>
  h.block(
    HoverIntentBinding.embedView({
      slotId: 'hover-intent',
      model,
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

const hiddenModel = HoverIntentBlock.init().model
const focusedUpdate = update(
  hiddenModel,
  Schema.decodeSync(HoverIntentSceneComposition.Message)({
    _tag: 'GotHoverIntentMessage',
    placement: 'HoverIntent',
    generation: 0,
    message: Message.FocusedTrigger(),
  }),
)

describe('HoverIntent', () => {
  describe('view', () => {
    it('attaches hover, focus, and Escape handlers to the trigger', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.given(hiddenModel),
        Scene.expect(trigger).toHaveHandler('mouseenter'),
        Scene.expect(trigger).toHaveHandler('mouseleave'),
        Scene.expect(trigger).toHaveHandler('focus'),
        Scene.expect(trigger).toHaveHandler('blur'),
        Scene.expect(trigger).toHaveHandler('keydown'),
      )
    })

    it('leaves panel markup to the consumer while hidden', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.given(hiddenModel),
        Scene.expect(panel).toBeAbsent(),
      )
    })

    it('attaches the same interaction handlers to a visible panel', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.given(focusedUpdate.model),
        Scene.expect(panel).toHaveHandler('mouseenter'),
        Scene.expect(panel).toHaveHandler('mouseleave'),
        Scene.expect(panel).toHaveHandler('focusin'),
        Scene.expect(panel).toHaveHandler('focusout'),
        Scene.expect(panel).toHaveHandler('keydown'),
      )
    })

    it('does not impose a role, ARIA attribute, or positioning style', () => {
      Scene.scene(
        { update, view: sceneView },
        Scene.given(focusedUpdate.model),
        Scene.expect(panel).not.toHaveAttr('role'),
        Scene.expect(panel).not.toHaveAttr('aria-controls'),
        Scene.expect(panel).not.toHaveStyle('position', 'absolute'),
      )
    })
  })
})
