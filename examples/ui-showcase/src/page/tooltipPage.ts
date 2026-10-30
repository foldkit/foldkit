import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Tooltip } from '@foldkit/ui'
import {
  type AnchorConfig,
  type RenderInfo,
  triggerId,
} from '@foldkit/ui/tooltip'

const Model = Schema.Struct({
  tooltipBasicDemo: Tooltip.Tooltip,
  tooltipNoDelayDemo: Tooltip.Tooltip,
})
type Model = typeof Model.Type

export class TooltipPage extends Block<TooltipPage>()('TooltipPage', {
  Model,
}) {}

export const TooltipPageLive = TooltipPage.make(
  Effect.fn(function* () {
    const tooltipBasicDemo = yield* new Tooltip.Tooltip('tooltipBasicDemo', {
      id: 'tooltip-basic-demo',
    })
    const tooltipNoDelayDemo = yield* new Tooltip.Tooltip(
      'tooltipNoDelayDemo',
      { id: 'tooltip-no-delay-demo', showDelay: 0 },
    )

    return {
      model: { tooltipBasicDemo, tooltipNoDelayDemo },
      view,
    }
  }),
).pipe(Layer.provide(Tooltip.TooltipLive))

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const panelClassName =
  'rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg'

const wrapperClassName = 'relative inline-block'

const TOOLTIP_ANCHOR: AnchorConfig = {
  placement: 'top',
  gap: 6,
  padding: 8,
}

const view = (model: Model, h: HtmlBuilder<never, unknown>): Html => {
  const basicTooltipView = ({ trigger, panel, isVisible }: RenderInfo): Html =>
    h.div(
      [h.Class(wrapperClassName)],
      [
        h.button(
          [...trigger, h.Class(triggerClassName)],
          [h.span([], ['Hover or focus me'])],
        ),
        ...(isVisible
          ? [
              h.div(
                [...panel, h.Class(panelClassName)],
                [h.span([], ['This is a tooltip'])],
              ),
            ]
          : []),
      ],
    )

  const noDelayTooltipView = ({
    trigger,
    panel,
    isVisible,
  }: RenderInfo): Html =>
    h.div(
      [h.Class(wrapperClassName)],
      [
        h.button(
          [...trigger, h.Class(triggerClassName)],
          [h.span([], ['No delay'])],
        ),
        ...(isVisible
          ? [
              h.div(
                [...panel, h.Class(panelClassName)],
                [h.span([], ['Shows immediately'])],
              ),
            ]
          : []),
      ],
    )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Tooltip']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.label(
        [
          h.For(triggerId(model.tooltipBasicDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Tooltip trigger'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.tooltipBasicDemo.view({
            anchor: TOOLTIP_ANCHOR,
            toView: basicTooltipView,
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['No delay'],
      ),
      h.label(
        [
          h.For(triggerId(model.tooltipNoDelayDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Tooltip trigger'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.tooltipNoDelayDemo.view({
            anchor: TOOLTIP_ANCHOR,
            toView: noDelayTooltipView,
          }),
        ],
      ),
    ],
  )
}
