// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Popover } from '@foldkit/ui'
import type { RenderInfo as PopoverRenderInfo } from '@foldkit/ui/popover'

// Add one Popover Block field for each level:
const Model = Schema.Struct({
  accountPopover: Popover.PopoverBlock.Model,
  accountDetailsPopover: Popover.PopoverBlock.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. Each Binding derives distinct
// generated Popover delivery.
const Message = defineMessageUnion({})

const AccountMenuDefinition = Block.makeDefinition('AccountMenu', {
  Model,
  Message,
})

const { makeNoopStep } = AccountMenuDefinition

const foldPopoverOutMessage = AccountMenuDefinition.makeOutMessageFold(
  Popover.PopoverBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  },
)

const AccountPopoverBinding = AccountMenuDefinition.makeBinding(
  Popover.PopoverBlock,
  {
    field: 'accountPopover',
    init: {
      contextToArgs: () =>
        Tuple.make({ id: 'account-popover', contentFocus: true }),
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

const AccountDetailsPopoverBinding = AccountMenuDefinition.makeBinding(
  Popover.PopoverBlock,
  {
    field: 'accountDetailsPopover',
    init: {
      contextToArgs: () => Tuple.make({ id: 'account-details-popover' }),
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

const AccountMenuComposition = AccountMenuDefinition.makeComposition({
  bindings: [AccountPopoverBinding, AccountDetailsPopoverBinding],
})

// The parent uses contentFocus so focus can move into its nested trigger
// instead of staying on the panel:
const init = AccountMenuComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = AccountMenuComposition.makeUpdate({})

// Inside your view function, render the child Popover inside the parent
// panel. `focusSelector` points at the child trigger, which Popover derives
// from the child id as `${id}-button`.
const view = AccountMenuComposition.makeView((model, h) => {
  const accountDetailsPopoverView = ({
    button,
    panel,
    backdrop,
    isVisible,
  }: PopoverRenderInfo) =>
    h.div(
      [h.Class('relative inline-block')],
      [
        h.button(
          [...button, h.Class('rounded-lg border px-3 py-2 cursor-pointer')],
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
    )

  const detailsPopover = h.block(
    AccountDetailsPopoverBinding.embedView({
      slotId: 'account-details-popover',
      model: model.accountDetailsPopover,
      viewInputs: {
        anchor: { placement: 'right-start', gap: 8, padding: 8 },
        toView: accountDetailsPopoverView,
      },
    }),
  )

  const accountPopoverView = ({
    button,
    panel,
    backdrop,
    isVisible,
  }: PopoverRenderInfo) =>
    h.div(
      [h.Class('relative inline-block')],
      [
        h.button(
          [...button, h.Class('rounded-lg border px-3 py-2 cursor-pointer')],
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
    )

  return h.block(
    AccountPopoverBinding.embedView({
      slotId: 'account-popover',
      model: model.accountPopover,
      viewInputs: {
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        focusSelector: '#account-details-popover-button',
        toView: accountPopoverView,
      },
    }),
  )
})
