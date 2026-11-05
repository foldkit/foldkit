import { clsx } from 'clsx'
import type { Html } from 'foldkit/html'

import { Button, Checkbox } from '@foldkit/ui'

import * as Icon from '../icon'
import { Message } from '../message'
import type { PaymentState } from '../model'
import { cancelCheckoutButton } from './cart'
import { primaryButtonClassName, secondaryButtonClassName } from './shared'

export const paymentView = (
  state: PaymentState,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [h.Class('grid gap-7')],
    [
      h.div(
        [
          h.Class(
            'flex items-start gap-3 border border-stone-300 bg-stone-50 p-4 text-sm leading-6 text-stone-600',
          ),
        ],
        [
          Icon.lockClosed('mt-0.5 h-5 w-5 shrink-0'),
          h.p(
            [],
            [
              'Payments are encrypted. Signal Press never stores your full card number.',
            ],
          ),
        ],
      ),
      h.section(
        [h.AriaLabel('Saved payment methods')],
        [
          h.h2(
            [h.Class('text-sm font-bold text-stone-900')],
            ['Saved payment method'],
          ),
          Checkbox.view(
            {
              id: 'saved-card',
              isChecked: state.isPaymentMethodSelected,
              hasDescription: true,
              onToggle: isSelected =>
                Message.ToggledPaymentMethod({ isSelected }),
              toView: attributes =>
                h.div(
                  [
                    ...attributes.checkbox,
                    h.Class(
                      clsx(
                        'mt-3 flex w-full cursor-pointer items-center justify-between gap-4 border-2 p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
                        {
                          'border-stone-900 bg-white':
                            state.isPaymentMethodSelected,
                          'border-stone-300 bg-stone-50 transition-colors hover:border-stone-500 hover:bg-white':
                            !state.isPaymentMethodSelected,
                        },
                      ),
                    ),
                  ],
                  [
                    h.div(
                      [h.Class('flex items-center gap-4')],
                      [
                        h.div(
                          [
                            h.Class(
                              'grid h-10 w-14 place-items-center border border-stone-300 bg-stone-50 text-xs font-bold tracking-widest text-stone-900',
                            ),
                          ],
                          ['MC'],
                        ),
                        h.div(
                          [],
                          [
                            h.div(
                              [
                                ...attributes.label,
                                h.Class('text-sm font-bold text-stone-900'),
                              ],
                              ['Mastercard •••• 4242'],
                            ),
                            h.div(
                              [
                                ...attributes.description,
                                h.Class('mt-1 text-xs text-stone-600'),
                              ],
                              ['Expires 08/29'],
                            ),
                          ],
                        ),
                      ],
                    ),
                    h.span(
                      [
                        h.Class(
                          clsx('h-6 w-6 rounded-full border', {
                            'grid place-items-center border-stone-900 bg-stone-900 text-white':
                              state.isPaymentMethodSelected,
                            'border-stone-500': !state.isPaymentMethodSelected,
                          }),
                        ),
                      ],
                      [
                        state.isPaymentMethodSelected
                          ? Icon.check('h-3.5 w-3.5')
                          : h.empty,
                      ],
                    ),
                  ],
                ),
            },
            h,
          ),
          h.p(
            [h.Class('mt-3 text-xs leading-5 text-stone-600')],
            [
              'Select the card above to continue. No charge is made until you place the order.',
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'grid gap-4 border-t border-stone-300 pt-6 sm:grid-cols-3 sm:items-center',
          ),
        ],
        [
          Button.view(
            {
              onClick: Message.ClickedBack(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(secondaryButtonClassName, 'sm:justify-self-start'),
                    ),
                  ],
                  [
                    state.isShippingRequired
                      ? 'Back to delivery'
                      : 'Back to bag',
                  ],
                ),
            },
            h,
          ),
          h.div([h.Class('sm:justify-self-center')], [cancelCheckoutButton(h)]),
          Button.view(
            {
              onClick: Message.ClickedContinue(),
              isDisabled: !state.isPaymentMethodSelected,
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(primaryButtonClassName, 'sm:justify-self-end'),
                    ),
                  ],
                  ['Review order', Icon.arrowRight()],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
import type { ApplicationViewBuilder } from '../composition'
