import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { AnchorTooltip, TooltipBlock, layer, triggerId } from './block.js'
import { Message } from './message.js'

const TooltipSceneKey = Symbol('TooltipScene')
const TooltipSceneBlock = Block.make('TooltipScene', {
  key: TooltipSceneKey,
  InitArgs: Block.makeInputContract<readonly []>(),
  Model: Schema.Struct({ tooltip: TooltipBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
})

const foldTooltipOutMessage = TooltipSceneBlock.makeOutMessageFold(
  TooltipBlock,
  {
    Shown: () => model => ({ model }),
    Hidden: () => model => ({ model }),
  },
)

const TooltipBinding = TooltipSceneBlock.makeRequiredFieldBinding(
  TooltipBlock,
  {
    field: 'tooltip',
    init: { contextToArgs: () => [{ id: 'test' }] },
  },
).withOutMessagePolicy({ fold: foldTooltipOutMessage })

const TooltipSceneComposition = TooltipSceneBlock.makeComposition({
  bindings: [TooltipBinding],
})

const init = TooltipSceneComposition.makeInit(() => ({ model: {} }))
const update = TooltipSceneComposition.makeUpdate({})

const acknowledgeAnchor = Scene.Mount.resolve(
  AnchorTooltip,
  Message.CompletedAnchorTooltip(),
)

type ViewInputs = Readonly<{
  isDisabled?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
}>

const rootView = TooltipSceneComposition.makeView.withInputs(
  (model, overrides, h) =>
    h.block(
      TooltipBinding.embedView({
        slotId: 'test',
        model: model.tooltip,
        viewInputs: {
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
        },
      }),
    ),
)

const trigger = Scene.selector('#test-trigger')
const panel = Scene.selector('#test-panel')

const tooltipScene = {
  block: TooltipSceneBlock,
  layer: TooltipSceneBlock.makeLayer({
    init,
    update,
    view: rootView,
  }).pipe(Layer.provide(layer)),
}

describe('Tooltip', () => {
  describe('view', () => {
    it.effect(
      'renders the trigger with aria-describedby and no data-open when hidden',
      () =>
        Scene.scene(
          { block: tooltipScene, viewInputs: {} },
          Scene.init(),
          Scene.expect(trigger).toHaveAttr('aria-describedby', 'test-panel'),
          Scene.expect(trigger).not.toHaveAttr('data-open'),
        ),
    )

    it.effect('does not render the panel when hidden', () =>
      Scene.scene(
        { block: tooltipScene, viewInputs: {} },
        Scene.init(),
        Scene.expect(panel).toBeAbsent(),
      ),
    )

    it.effect('renders the panel with role=tooltip when open', () =>
      Scene.scene(
        { block: tooltipScene, viewInputs: {} },
        Scene.init(),
        Scene.focus(trigger),
        Scene.expect(panel).toExist(),
        Scene.expect(panel).toHaveAttr('role', 'tooltip'),
        Scene.expect(panel).toHaveAttr('id', 'test-panel'),
        acknowledgeAnchor,
      ),
    )

    it.effect('marks the trigger with data-open when visible', () =>
      Scene.scene(
        { block: tooltipScene, viewInputs: {} },
        Scene.init(),
        Scene.focus(trigger),
        Scene.expect(trigger).toHaveAttr('data-open', ''),
        acknowledgeAnchor,
      ),
    )

    it.effect('adds anchor positioning styles and hooks to the panel', () =>
      Scene.scene(
        { block: tooltipScene, viewInputs: {} },
        Scene.init(),
        Scene.focus(trigger),
        Scene.expect(panel).toHaveStyle('position', 'absolute'),
        Scene.expect(panel).toHaveStyle('margin', '0'),
        Scene.expect(panel).toHaveStyle('visibility', 'hidden'),
        Scene.expect(panel).toHaveStyle('pointerEvents', 'none'),
        Scene.expect(panel).toHaveHook('insert'),
        Scene.expect(panel).toHaveHook('destroy'),
        acknowledgeAnchor,
      ),
    )

    it.effect('does not attach interaction handlers when disabled', () =>
      Scene.scene(
        { block: tooltipScene, viewInputs: { isDisabled: true } },
        Scene.init(),
        Scene.expect(trigger).toHaveAttr('aria-disabled', 'true'),
        Scene.expect(trigger).toHaveAttr('data-disabled', ''),
        Scene.expect(trigger).not.toHaveHandler('mouseenter'),
        Scene.expect(trigger).not.toHaveHandler('focus'),
      ),
    )
  })

  describe('trigger labeling', () => {
    it.effect(
      'no aria-label or aria-labelledby on the trigger by default',
      () =>
        Scene.scene(
          { block: tooltipScene, viewInputs: {} },
          Scene.init(),
          Scene.expect(trigger).not.toHaveAttr('aria-label'),
          Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-label to the trigger when ariaLabel is provided',
      () =>
        Scene.scene(
          { block: tooltipScene, viewInputs: { ariaLabel: 'More info' } },
          Scene.init(),
          Scene.expect(trigger).toHaveAttr('aria-label', 'More info'),
          Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it.effect(
      'applies aria-labelledby to the trigger when ariaLabelledBy is provided',
      () =>
        Scene.scene(
          {
            block: tooltipScene,
            viewInputs: { ariaLabelledBy: 'info-label' },
          },
          Scene.init(),
          Scene.expect(trigger).toHaveAttr('aria-labelledby', 'info-label'),
          Scene.expect(trigger).not.toHaveAttr('aria-label'),
        ),
    )

    it.effect(
      'prefers aria-label over aria-labelledby when both are provided',
      () =>
        Scene.scene(
          {
            block: tooltipScene,
            viewInputs: {
              ariaLabel: 'More info',
              ariaLabelledBy: 'info-label',
            },
          },
          Scene.init(),
          Scene.expect(trigger).toHaveAttr('aria-label', 'More info'),
          Scene.expect(trigger).not.toHaveAttr('aria-labelledby'),
        ),
    )

    it('triggerId derives the trigger id from the base id', () => {
      expect(triggerId('test')).toBe('test-trigger')
    })
  })
})
