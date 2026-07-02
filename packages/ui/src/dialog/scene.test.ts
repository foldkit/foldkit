import { html, submodel } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import type { Message, Model } from './index.js'
import { init, update, view } from './index.js'

const sceneView =
  (overrides: { hasDescription?: boolean } = {}) =>
  (model: Model) => {
    const h = html<Message>()

    return submodel({
      slotId: 'test',
      view,
      model,
      viewInputs: {
        hasDescription: overrides.hasDescription,
        toView: ({ dialog, backdrop, panel, isVisible }) =>
          h.dialog(
            [...dialog],
            isVisible
              ? [
                  h.div([...backdrop], []),
                  h.div(
                    [...panel],
                    [
                      h.h2([h.Id('test-title')], ['Title']),
                      h.p([h.Id('test-description')], ['Description']),
                    ],
                  ),
                ]
              : [],
          ),
      },
      toParentMessage: message => message,
    })
  }

const dialog = Scene.selector('#test')

const openModel = init({ id: 'test', isOpen: true })

describe('Dialog', () => {
  describe('view', () => {
    it('omits aria-describedby when no description is wired', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(dialog).not.toHaveAttr('aria-describedby'),
      )
    })

    it('sets aria-describedby when a description is wired', () => {
      Scene.scene(
        { update, view: sceneView({ hasDescription: true }) },
        Scene.with(openModel),
        Scene.expect(dialog).toHaveAttr('aria-describedby', 'test-description'),
      )
    })
  })
})
