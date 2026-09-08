// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Popover } from '@foldkit/ui'

// Add one Popover Submodel field for each level:
const Model = Schema.Struct({
  accountPopover: Popover.Model,
  accountDetailsPopover: Popover.Model,
  // ...your other fields
})
type Model = typeof Model.Type

// The parent uses contentFocus so focus can move into its nested trigger
// instead of staying on the panel:
const init = () => ({
  model: {
    accountPopover: Popover.init({
      id: 'account-popover',
      contentFocus: true,
    }),
    accountDetailsPopover: Popover.init({ id: 'account-details-popover' }),
    // ...your other fields
  },
})

// Embed each Popover Message in your parent Message:
const Message = defineMessageUnion({
  GotAccountPopoverMessage: { message: Popover.Message },
  GotAccountDetailsPopoverMessage: { message: Popover.Message },
})
type Message = typeof Message.Type

const foldPopoverOutMessage = Popover.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldAccountPopover = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.accountPopover),
  write: (model, nextAccountPopover) =>
    evo(model, { accountPopover: () => nextAccountPopover }),
  toParentMessage: message => Message.GotAccountPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldAccountDetailsPopover = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.accountDetailsPopover),
  write: (model, nextAccountDetailsPopover) =>
    evo(model, { accountDetailsPopover: () => nextAccountDetailsPopover }),
  toParentMessage: message =>
    Message.GotAccountDetailsPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

// In the corresponding Message.match handlers, delegate each
// Popover to its own Model field:
GotAccountPopoverMessage: ({ message }) => foldAccountPopover(model, message)

GotAccountDetailsPopoverMessage: ({ message }) =>
  foldAccountDetailsPopover(model, message)

// Inside your view function, render the child Popover inside the parent
// panel. `focusSelector` points at the child trigger, which Popover derives
// from the child id as `${id}-button`.
const view = (h: HtmlBuilder<Message>) => {
  const detailsPopover = h.submodel({
    slotId: 'account-details-popover',
    model: model.accountDetailsPopover,
    view: Popover.view,
    viewInputs: {
      anchor: { placement: 'right-start', gap: 8, padding: 8 },
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class('relative inline-block')],
          [
            h.button(
              [
                ...button,
                h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
              ],
              [h.span([], ['Advanced settings'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0')]),
                  h.div(
                    [...panel, h.Class('rounded-lg border shadow-lg p-4 w-64')],
                    [
                      h.p([h.Class('font-medium')], ['Permissions']),
                      h.p(
                        [h.Class('text-sm text-gray-500')],
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
    toParentMessage: message =>
      Message.GotAccountDetailsPopoverMessage({ message }),
  })

  return h.submodel({
    slotId: 'account-popover',
    model: model.accountPopover,
    view: Popover.view,
    viewInputs: {
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
      focusSelector: '#account-details-popover-button',
      toView: ({ button, panel, backdrop, isVisible }) =>
        h.div(
          [h.Class('relative inline-block')],
          [
            h.button(
              [
                ...button,
                h.Class('rounded-lg border px-3 py-2 cursor-pointer'),
              ],
              [h.span([], ['Account'])],
            ),
            ...(isVisible
              ? [
                  h.div([...backdrop, h.Class('fixed inset-0')]),
                  h.div(
                    [...panel, h.Class('rounded-lg border shadow-lg p-4 w-72')],
                    [
                      h.p([], ['Manage account settings from this panel.']),
                      detailsPopover,
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => Message.GotAccountPopoverMessage({ message }),
  })
}
