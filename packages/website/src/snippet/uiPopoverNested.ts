// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add one Popover Submodel for each level:
const Model = S.Struct({
  accountPopover: Ui.Popover.Model,
  accountDetailsPopover: Ui.Popover.Model,
  // ...your other fields
})

// The parent uses contentFocus so focus can move into its nested trigger:
const init = () => [
  {
    accountPopover: Ui.Popover.init({
      id: 'account-popover',
      contentFocus: true,
    }),
    accountDetailsPopover: Ui.Popover.init({
      id: 'account-details-popover',
    }),
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
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotAccountPopoverMessage({ message })),
      ),
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
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotAccountDetailsPopoverMessage({ message })),
      ),
    ),
  ]
}

// Inside your view function, render the child Popover inside the parent panel.
// `focusSelector` points at the child trigger, which Popover derives from the
// child id as `${id}-button`.
const view = () => {
  const h = html<Message>()

  const detailsPopover = Ui.Popover.view({
    model: model.accountDetailsPopover,
    toParentMessage: message => GotAccountDetailsPopoverMessage({ message }),
    anchor: { placement: 'right-start', gap: 8, padding: 8 },
    buttonContent: h.span([], ['More details']),
    buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
    panelContent: h.div(
      [],
      [
        h.p([h.Class('font-medium')], ['Permissions']),
        h.p(
          [h.Class('text-sm text-gray-500')],
          ['Review who can update billing, members, and integrations.'],
        ),
      ],
    ),
    panelClassName: 'rounded-lg border shadow-lg p-4 w-64',
    backdropClassName: 'fixed inset-0',
  })

  return Ui.Popover.view({
    model: model.accountPopover,
    toParentMessage: message => GotAccountPopoverMessage({ message }),
    anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    focusSelector: '#account-details-popover-button',
    buttonContent: h.span([], ['Account']),
    buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
    panelContent: h.div(
      [h.Class('flex flex-col gap-3')],
      [h.p([], ['Manage account settings from this panel.']), detailsPopover],
    ),
    panelClassName: 'rounded-lg border shadow-lg p-4 w-72',
    backdropClassName: 'fixed inset-0',
  })
}
