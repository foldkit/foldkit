import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

import { Popover } from '@foldkit/ui'
import type { RenderInfo as PopoverRenderInfo } from '@foldkit/ui/popover'

export class AccountMenu extends Block<AccountMenu>()('AccountMenu', {
  Model: Schema.Struct({
    accountPopover: Popover.Popover,
    accountDetailsPopover: Popover.Popover,
  }),
}) {}

export const AccountMenuLive = AccountMenu.make(
  Effect.fn(function* () {
    // contentFocus lets focus move into the nested trigger instead of
    // staying on the parent panel
    const accountPopover = yield* new Popover.Popover('accountPopover', {
      id: 'account-popover',
      contentFocus: true,
    })
    const accountDetailsPopover = yield* new Popover.Popover(
      'accountDetailsPopover',
      { id: 'account-details-popover' },
    )

    return {
      model: { accountPopover, accountDetailsPopover },

      // Render the child Popover inside the parent panel. `focusSelector`
      // points at the child trigger, which Popover derives from the child id
      // as `${id}-button`.
      view: (model, h) => {
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
                      [
                        ...panel,
                        h.Class('rounded-lg border shadow-lg p-4 w-64'),
                      ],
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

        const detailsPopover = model.accountDetailsPopover.view({
          anchor: { placement: 'right-start', gap: 8, padding: 8 },
          toView: accountDetailsPopoverView,
        })

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
                      [
                        ...panel,
                        h.Class('rounded-lg border shadow-lg p-4 w-72'),
                      ],
                      [
                        h.p([], ['Manage account settings from this panel.']),
                        detailsPopover,
                      ],
                    ),
                  ]
                : []),
            ],
          )

        return model.accountPopover.view({
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          focusSelector: '#account-details-popover-button',
          toView: accountPopoverView,
        })
      },
    }
  }),
).pipe(Layer.provide(Popover.PopoverLive))
