import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Popover } from '@foldkit/ui'

import {
  GotPopoverAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverNestedChildDemoMessage,
  GotPopoverNestedParentDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-normal cursor-pointer transition rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 select-none'

const basicPanelClassName =
  'w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-10 outline-none'

const animatedPanelClassName =
  'w-64 rounded-lg border border-gray-200 bg-white shadow-lg p-4 z-10 outline-none transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const POPOVER_ANCHOR = {
  placement: 'bottom-start' as const,
  gap: 4,
  padding: 8,
}

const popoverPanelContent = (): Html => {
  const h = html()

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

const popoverDemo = (
  id: string,
  popoverModel: Popover.Model,
  toParentMessage: (message: Popover.Message) => UiMessage,
  panelClassNameValue: string,
): Html => {
  const h = html<UiMessage>()

  return h.submodel({
    slotId: id,
    model: popoverModel,
    view: Popover.view,
    viewInputs: {
      anchor: POPOVER_ANCHOR,
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class(wrapperClassName)],
          [
            h.button(
              [...button, h.Class(triggerClassName)],
              [h.span([], ['Solutions'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
                  h.div(
                    [...panel, h.Class(panelClassNameValue)],
                    [popoverPanelContent()],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage,
  })
}

const NESTED_POPOVER_ANCHOR = {
  placement: 'right-start' as const,
  gap: 8,
  padding: 8,
}

const nestedChildButtonSelector = '#popover-nested-child-demo-button'

const nestedChildPopover = (childPopoverModel: Popover.Model): Html => {
  const h = html<UiMessage>()

  return h.submodel({
    slotId: childPopoverModel.id,
    model: childPopoverModel,
    view: Popover.view,
    viewInputs: {
      ariaLabel: 'Advanced settings',
      anchor: NESTED_POPOVER_ANCHOR,
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class(wrapperClassName)],
          [
            h.button(
              [...button, h.Class(triggerClassName)],
              [h.span([], ['Advanced settings'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class(backdropClassName)], []),
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
        ),
    },
    toParentMessage: message => GotPopoverNestedChildDemoMessage({ message }),
  })
}

const nestedDemo = (
  parentPopoverModel: Popover.Model,
  childPopoverModel: Popover.Model,
): Html => {
  const h = html<UiMessage>()

  return h.div(
    [h.Class('relative')],
    [
      h.submodel({
        slotId: parentPopoverModel.id,
        model: parentPopoverModel,
        view: Popover.view,
        viewInputs: {
          anchor: POPOVER_ANCHOR,
          focusSelector: nestedChildButtonSelector,
          toView: ({ button, panel, backdrop, isVisible }) =>
            h.div(
              [h.Class(wrapperClassName)],
              [
                h.button(
                  [...button, h.Class(triggerClassName)],
                  [h.span([], ['Account'])],
                ),
                ...(isVisible
                  ? [
                      h.div([...backdrop, h.Class(backdropClassName)], []),
                      h.div(
                        [...panel, h.Class(basicPanelClassName)],
                        [
                          h.div(
                            [h.Class('flex flex-col gap-4')],
                            [
                              h.p(
                                [h.Class('text-sm text-gray-600')],
                                [
                                  'Manage account settings without leaving this panel.',
                                ],
                              ),
                              nestedChildPopover(childPopoverModel),
                            ],
                          ),
                        ],
                      ),
                    ]
                  : []),
              ],
            ),
        },
        toParentMessage: message =>
          GotPopoverNestedParentDemoMessage({ message }),
      }),
    ],
  )
}

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

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
          h.For(Popover.buttonId(model.popoverBasicDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Product menu'],
      ),
      h.div(
        [h.Class('relative')],
        [
          popoverDemo(
            model.popoverBasicDemo.id,
            model.popoverBasicDemo,
            message => GotPopoverBasicDemoMessage({ message }),
            basicPanelClassName,
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Animated'],
      ),
      h.label(
        [
          h.For(Popover.buttonId(model.popoverAnimatedDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Product menu'],
      ),
      h.div(
        [h.Class('relative')],
        [
          popoverDemo(
            model.popoverAnimatedDemo.id,
            model.popoverAnimatedDemo,
            message => GotPopoverAnimatedDemoMessage({ message }),
            animatedPanelClassName,
          ),
        ],
      ),

      h.h3(
        [h.Class('text-lg font-semibold text-gray-900 mt-8 mb-4')],
        ['Nested'],
      ),
      h.label(
        [
          h.For(Popover.buttonId(model.popoverNestedParentDemo.id)),
          h.Class('block mb-1.5 text-sm font-medium text-gray-900'),
        ],
        ['Account'],
      ),
      nestedDemo(model.popoverNestedParentDemo, model.popoverNestedChildDemo),
    ],
  )
})
