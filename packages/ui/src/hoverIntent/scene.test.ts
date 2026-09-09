import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import type { Model } from './index.js'
import { Message, init, update, view } from './index.js'

const sceneView = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'hover-intent',
    model,
    view,
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
    toParentMessage: message => message,
  })

const trigger = Scene.selector('#trigger')
const panel = Scene.selector('#panel')

const hiddenModel = init()
const focusedUpdate = update(hiddenModel, Message.FocusedTrigger())

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
