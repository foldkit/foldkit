// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add one Popover Submodel field for each level:
const Model = S.Struct({
  accountPopover: Ui.Popover.Model,
  accountDetailsPopover: Ui.Popover.Model,
  // ...your other fields
})

// The parent uses contentFocus so focus can move into its nested trigger
// instead of staying on the panel:
const init = () => [
  {
    accountPopover: Ui.Popover.init({
      id: 'account-popover',
      contentFocus: true,
    }),
    accountDetailsPopover: Ui.Popover.init({ id: 'account-details-popover' }),
    // ...your other fields
  },
  [],
]

// Embed each Popover Message in your parent Message:
const GotAccountPopoverMessage = m('GotAccountPopoverMessage', {
  message: Ui.Popover.Message,
})

const GotAccountDetailsPopoverMessage = m('GotAccountDetailsPopoverMessage', {
  message: Ui.Popover.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate each
// Popover to its own Model field:
GotAccountPopoverMessage: ({ message }) => {
  const [nextAccountPopover, commands] = Ui.Popover.update(
    model.accountPopover,
    message,
  )

  return [
    evo(model, { accountPopover: () => nextAccountPopover }),
    Command.mapMessages(commands, message =>
      GotAccountPopoverMessage({ message }),
    ),
  ]
}

GotAccountDetailsPopoverMessage: ({ message }) => {
  const [nextAccountDetailsPopover, commands] = Ui.Popover.update(
    model.accountDetailsPopover,
    message,
  )

  return [
    evo(model, { accountDetailsPopover: () => nextAccountDetailsPopover }),
    Command.mapMessages(commands, message =>
      GotAccountDetailsPopoverMessage({ message }),
    ),
  ]
}

// Inside your view function, render the child Popover inside the parent
// panel. `focusSelector` points at the child trigger, which Popover derives
// from the child id as `${id}-button`.
const view = () => {
  const h = html<Message>()

  const detailsPopover = h.submodel({
    slotId: 'account-details-popover',
    model: model.accountDetailsPopover,
    view: Ui.Popover.view,
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
                  h.div([...backdrop, h.Class('fixed inset-0')], []),
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
    toParentMessage: message => GotAccountDetailsPopoverMessage({ message }),
  })

  return h.submodel({
    slotId: 'account-popover',
    model: model.accountPopover,
    view: Ui.Popover.view,
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
                  h.div([...backdrop, h.Class('fixed inset-0')], []),
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
    toParentMessage: message => GotAccountPopoverMessage({ message }),
  })
}
