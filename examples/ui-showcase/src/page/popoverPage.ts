import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Popover } from '@foldkit/ui'
import {
  type AnchorConfig,
  type RenderInfo,
  buttonId,
} from '@foldkit/ui/popover'

const Model = Schema.Struct({
  popoverBasicDemo: Popover.Popover,
  popoverAnimatedDemo: Popover.Popover,
  popoverNestedParentDemo: Popover.Popover,
  popoverNestedChildDemo: Popover.Popover,
})
type Model = typeof Model.Type

export class PopoverPage extends Block<PopoverPage>()('PopoverPage', {
  Model,
}) {}

export const PopoverPageLive = PopoverPage.make(
  Effect.fn(function* () {
    const popoverBasicDemo = yield* new Popover.Popover('popoverBasicDemo', {
      id: 'popover-basic-demo',
    })
    const popoverAnimatedDemo = yield* new Popover.Popover(
      'popoverAnimatedDemo',
      { id: 'popover-animated-demo', isAnimated: true },
    )
    const popoverNestedParentDemo = yield* new Popover.Popover(
      'popoverNestedParentDemo',
      { id: 'popover-nested-parent-demo', contentFocus: true },
    )
    const popoverNestedChildDemo = yield* new Popover.Popover(
      'popoverNestedChildDemo',
      { id: 'popover-nested-child-demo' },
    )

    return {
      model: {
        popoverBasicDemo,
        popoverAnimatedDemo,
        popoverNestedParentDemo,
        popoverNestedChildDemo,
      },
      view,
    }
  }),
).pipe(Layer.provide(Popover.PopoverLive))

type PopoverModel = Model['popoverBasicDemo']

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const basicPanelClassName =
  'w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-10 outline-none'

const animatedPanelClassName =
  'w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const POPOVER_ANCHOR: AnchorConfig = {
  placement: 'bottom-start',
  gap: 4,
  padding: 8,
}

const popoverPanelContent = (h: HtmlBuilder<never, unknown>) => {
  return h.div(
    [],
    [
      h.p([h.Class('text-sm font-semibold text-gray-900 mb-2')], ['Analytics']),
      h.p(
        [h.Class('text-sm text-gray-600')],
        ['Get a better understanding of where your traffic is coming from.'],
      ),
    ],
  )
}

const makePopoverView =
  (
    panelClassNameValue: string,
    h: HtmlBuilder<never, unknown>,
  ): ((renderInfo: RenderInfo) => Html) =>
  ({ button, panel, backdrop, isVisible }) =>
    h.div(
      [h.Class(wrapperClassName)],
      [
        h.button(
          [...button, h.Class(triggerClassName)],
          [h.span([], ['Solutions'])],
        ),
        ...(isVisible
          ? [
              h.div([...backdrop, h.Class(backdropClassName)]),
              h.div(
                [...panel, h.Class(panelClassNameValue)],
                [popoverPanelContent(h)],
              ),
            ]
          : []),
      ],
    )

const NESTED_POPOVER_ANCHOR: AnchorConfig = {
  placement: 'right-start',
  gap: 8,
  padding: 8,
}

const nestedChildButtonSelector = '#popover-nested-child-demo-button'

const nestedChildPopover = (
  childPopoverModel: PopoverModel,
  h: HtmlBuilder<never, unknown>,
) => {
  const childPopoverView = ({
    button,
    panel,
    backdrop,
    isVisible,
  }: RenderInfo): Html =>
    h.div(
      [h.Class(wrapperClassName)],
      [
        h.button(
          [...button, h.Class(triggerClassName)],
          [h.span([], ['Advanced settings'])],
        ),
        ...(isVisible
          ? [
              h.div([...backdrop, h.Class(backdropClassName)]),
              h.div(
                [...panel, h.Class(basicPanelClassName)],
                [
                  h.p(
                    [h.Class('text-sm font-semibold text-gray-900 mb-2')],
                    ['Permissions'],
                  ),
                  h.p(
                    [h.Class('text-sm text-gray-600')],
                    [
                      'Review who can change billing, members, and integrations.',
                    ],
                  ),
                ],
              ),
            ]
          : []),
      ],
    )

  return childPopoverModel.view({
    ariaLabel: 'Advanced settings',
    anchor: NESTED_POPOVER_ANCHOR,
    toView: childPopoverView,
  })
}

const nestedDemo = (
  parentPopoverModel: PopoverModel,
  childPopoverModel: PopoverModel,
  h: HtmlBuilder<never, unknown>,
): Html => {
  const parentPopoverView = ({
    button,
    panel,
    backdrop,
    isVisible,
  }: RenderInfo): Html =>
    h.div(
      [h.Class(wrapperClassName)],
      [
        h.button(
          [...button, h.Class(triggerClassName)],
          [h.span([], ['Account'])],
        ),
        ...(isVisible
          ? [
              h.div([...backdrop, h.Class(backdropClassName)]),
              h.div(
                [...panel, h.Class(basicPanelClassName)],
                [
                  h.div(
                    [h.Class('flex flex-col gap-4')],
                    [
                      h.p(
                        [h.Class('text-sm text-gray-600')],
                        ['Manage account settings without leaving this panel.'],
                      ),
                      nestedChildPopover(childPopoverModel, h),
                    ],
                  ),
                ],
              ),
            ]
          : []),
      ],
    )

  return h.div(
    [h.Class('relative')],
    [
      parentPopoverModel.view({
        anchor: POPOVER_ANCHOR,
        focusSelector: nestedChildButtonSelector,
        toView: parentPopoverView,
      }),
    ],
  )
}

const view = (model: Model, h: HtmlBuilder<never, unknown>): Html => {
  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['Popover']),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Basic'],
      ),
      h.label(
        [
          h.For(buttonId(model.popoverBasicDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Product menu'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.popoverBasicDemo.view({
            anchor: POPOVER_ANCHOR,
            toView: makePopoverView(basicPanelClassName, h),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.label(
        [
          h.For(buttonId(model.popoverAnimatedDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Product menu'],
      ),
      h.div(
        [h.Class('relative')],
        [
          model.popoverAnimatedDemo.view({
            anchor: POPOVER_ANCHOR,
            toView: makePopoverView(animatedPanelClassName, h),
          }),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Nested'],
      ),
      h.label(
        [
          h.For(buttonId(model.popoverNestedParentDemo.model.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Account'],
      ),
      nestedDemo(
        model.popoverNestedParentDemo,
        model.popoverNestedChildDemo,
        h,
      ),
    ],
  )
}
