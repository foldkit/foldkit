import { describe, it } from '@effect/vitest'

import { html, submodel } from '../../html/index.js'
import * as Scene from '../../test/scene.js'
import type { Message, Model } from './index.js'
import {
  AnchorTooltip,
  CompletedAnchorTooltip,
  FocusedTrigger,
  init,
  update,
  view,
} from './index.js'

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorTooltip,
  CompletedAnchorTooltip(),
)

const sceneView =
  (overrides: { isDisabled?: boolean } = {}) =>
  (model: Model) => {
    const h = html<Message>()

    return submodel({
      slotId: 'test',
      view,
      model,
      viewInputs: {
        anchor: { placement: 'top' },
        isDisabled: overrides.isDisabled,
        toView: ({ trigger, panel, isVisible }) =>
          h.div(
            [],
            [
              h.button([...trigger], []),
              ...(isVisible ? [h.div([...panel], [])] : []),
            ],
          ),
      },
      toParentMessage: message => message,
    })
  }

const trigger = Scene.selector('#test-trigger')
const panel = Scene.selector('#test-panel')

const hiddenModel = init({ id: 'test' })
const [openModel] = update(init({ id: 'test' }), FocusedTrigger())

describe('Tooltip', () => {
  describe('view', () => {
    it('renders the trigger with aria-describedby and no data-open when hidden', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(hiddenModel),
        Scene.expect(trigger).toHaveAttr('aria-describedby', 'test-panel'),
        Scene.expect(trigger).not.toHaveAttr('data-open'),
      )
    })

    it('does not render the panel when hidden', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(hiddenModel),
        Scene.expect(panel).toBeAbsent(),
      )
    })

    it('renders the panel with role=tooltip when open', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toExist(),
        Scene.expect(panel).toHaveAttr('role', 'tooltip'),
        Scene.expect(panel).toHaveAttr('id', 'test-panel'),
        acknowledgeAnchor,
      )
    })

    it('marks the trigger with data-open when visible', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(trigger).toHaveAttr('data-open', ''),
        acknowledgeAnchor,
      )
    })

    it('adds anchor positioning styles and hooks to the panel', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(openModel),
        Scene.expect(panel).toHaveStyle('position', 'absolute'),
        Scene.expect(panel).toHaveStyle('margin', '0'),
        Scene.expect(panel).toHaveStyle('visibility', 'hidden'),
        Scene.expect(panel).toHaveStyle('pointerEvents', 'none'),
        Scene.expect(panel).toHaveHook('insert'),
        Scene.expect(panel).toHaveHook('destroy'),
        acknowledgeAnchor,
      )
    })

    it('does not attach interaction handlers when disabled', () => {
      Scene.scene(
        { update, view: sceneView({ isDisabled: true }) },
        Scene.with(hiddenModel),
        Scene.expect(trigger).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(trigger).toHaveAttr('data-disabled', ''),
        Scene.expect(trigger).not.toHaveHandler('mouseenter'),
        Scene.expect(trigger).not.toHaveHandler('focus'),
      )
    })
  })
})
