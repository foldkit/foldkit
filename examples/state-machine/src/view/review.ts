import { clsx } from 'clsx'
import type { Html } from 'foldkit/html'

import { Button, Checkbox, Input } from '@foldkit/ui'

import * as Icon from '../icon'
import { isReviewReady, promoToMaybeDiscount } from '../machine'
import { Message } from '../message'
import { Promo, editionName } from '../model'
import type { ReviewState } from '../model'
import { cancelCheckoutButton } from './cart'
import {
  formatMoney,
  orderPricing,
  primaryButtonClassName,
  promoFeedbackClassName,
  secondaryButtonClassName,
} from './shared'

export const reviewView = (
  state: ReviewState,
  h: ApplicationViewBuilder,
): Html => {
  const isReadyToPlace = isReviewReady(state)
  const pricing = orderPricing(
    state.isShippingRequired,
    promoToMaybeDiscount(state.promo),
  )

  return h.div(
    [h.Class('grid gap-7')],
    [
      h.div(
        [h.Class('divide-y divide-stone-300 border-y border-stone-300')],
        [
          h.div(
            [h.Class('grid gap-2 py-5 sm:grid-cols-4 sm:items-start')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                ['Edition'],
              ),
              h.div(
                [h.Class('sm:col-span-2')],
                [
                  h.div(
                    [h.Class('text-sm font-bold text-stone-900')],
                    [editionName(state.isShippingRequired)],
                  ),
                  h.div(
                    [h.Class('mt-1 text-xs text-stone-600')],
                    ['Designing Durable Interfaces'],
                  ),
                ],
              ),
              h.div(
                [h.Class('text-sm font-bold text-stone-900')],
                [formatMoney(pricing.subtotal)],
              ),
            ],
          ),
          h.div(
            [h.Class('grid gap-2 py-5 sm:grid-cols-4 sm:items-start')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                [state.isShippingRequired ? 'Delivery' : 'Fulfillment'],
              ),
              h.div(
                [h.Class('sm:col-span-2')],
                [
                  h.div(
                    [h.Class('text-sm font-bold text-stone-900')],
                    [
                      state.isShippingRequired
                        ? 'Standard tracked delivery'
                        : 'Email delivery',
                    ],
                  ),
                  h.div(
                    [h.Class('mt-1 text-xs leading-5 text-stone-600')],
                    [
                      state.isShippingRequired
                        ? 'Alex Morgan · 42 Market Street · Brooklyn, NY 11201'
                        : 'PDF and EPUB files sent to alex.morgan@example.com',
                    ],
                  ),
                ],
              ),
              h.div([h.Class('text-sm font-bold text-stone-900')], ['Free']),
            ],
          ),
          h.div(
            [h.Class('grid gap-2 py-5 sm:grid-cols-4 sm:items-center')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                ['Payment'],
              ),
              h.div(
                [
                  h.Class(
                    'flex items-center gap-2 text-sm text-stone-900 sm:col-span-2',
                  ),
                ],
                [
                  Icon.creditCard(),
                  state.isPaymentMethodSelected
                    ? 'Mastercard •••• 4242'
                    : 'Payment method required',
                ],
              ),
              Button.view(
                {
                  onClick: Message.ToggledPaymentMethod({
                    isSelected: !state.isPaymentMethodSelected,
                  }),
                  toView: attributes =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Class(
                          'cursor-pointer text-xs font-bold uppercase tracking-wider text-orange-800 underline underline-offset-4',
                        ),
                      ],
                      [
                        state.isPaymentMethodSelected
                          ? 'Change'
                          : 'Use saved card',
                      ],
                    ),
                },
                h,
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('grid gap-2')],
        [
          h.form(
            [
              h.Class('flex items-end gap-3'),
              h.OnSubmit(Message.SubmittedPromoCode()),
            ],
            [
              Input.view(
                {
                  id: 'promo-code',
                  value: state.promoCodeInput,
                  onInput: value => Message.UpdatedPromoCode({ value }),
                  toView: attributes =>
                    h.div(
                      [h.Class('grid flex-1 gap-2 sm:max-w-xs')],
                      [
                        h.label(
                          [
                            ...attributes.label,
                            h.Class(
                              'text-xs font-bold uppercase tracking-widest text-stone-600',
                            ),
                          ],
                          ['Promo code'],
                        ),
                        h.input([
                          ...attributes.input,
                          h.Class(
                            'min-h-12 border border-stone-500 bg-white px-3 text-sm text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
                          ),
                        ]),
                      ],
                    ),
                },
                h,
              ),
              Button.view(
                {
                  type: 'submit',
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class(secondaryButtonClassName)],
                      ['Apply'],
                    ),
                },
                h,
              ),
            ],
          ),
          Promo.match(state.promo, {
            NoPromo: () => h.p([h.Class(promoFeedbackClassName)], ['']),
            AppliedPromo: ({ discount }) =>
              h.p(
                [h.Class(clsx(promoFeedbackClassName, 'text-orange-800'))],
                [`${discount.code} applied · ${discount.percentOff}% off`],
              ),
            RejectedPromo: () =>
              h.p(
                [h.Class(clsx(promoFeedbackClassName, 'text-red-700'))],
                ["That code isn't recognized."],
              ),
          }),
        ],
      ),
      Checkbox.view(
        {
          id: 'accept-terms',
          isChecked: state.isTermsAccepted,
          hasDescription: true,
          onToggle: isAccepted => Message.ToggledTermsAccepted({ isAccepted }),
          toView: attributes =>
            h.div(
              [
                h.Class(
                  'flex items-start gap-3 text-sm leading-6 text-stone-600',
                ),
              ],
              [
                h.span(
                  [
                    ...attributes.checkbox,
                    h.Class(
                      clsx(
                        'mt-0.5 h-5 w-5 shrink-0 cursor-pointer border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900',
                        {
                          'grid place-items-center border-stone-900 bg-stone-900 text-white':
                            state.isTermsAccepted,
                          'border-stone-500 bg-white': !state.isTermsAccepted,
                        },
                      ),
                    ),
                  ],
                  [state.isTermsAccepted ? Icon.check('h-3.5 w-3.5') : h.empty],
                ),
                h.span(
                  [],
                  [
                    h.span(
                      [...attributes.label, h.Class('sr-only')],
                      ['Accept terms of sale'],
                    ),
                    h.span(
                      [
                        ...attributes.description,
                        h.OnClick(
                          Message.ToggledTermsAccepted({
                            isAccepted: !state.isTermsAccepted,
                          }),
                        ),
                        h.Class('cursor-pointer'),
                      ],
                      [
                        state.isShippingRequired
                          ? 'I agree to the terms of sale and return policy.'
                          : 'I agree to the terms of sale and understand that digital purchases are delivered immediately.',
                      ],
                    ),
                  ],
                ),
              ],
            ),
        },
        h,
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
                  ['Back to payment'],
                ),
            },
            h,
          ),
          h.div([h.Class('sm:justify-self-center')], [cancelCheckoutButton(h)]),
          Button.view(
            {
              onClick: Message.ClickedPlaceOrder(),
              isDisabled: !isReadyToPlace,
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(primaryButtonClassName, 'sm:justify-self-end'),
                    ),
                  ],
                  [`Place order · ${formatMoney(pricing.total)}`],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
}
import type { ApplicationViewBuilder } from '../composition'
