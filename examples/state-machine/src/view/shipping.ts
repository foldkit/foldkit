import { clsx } from 'clsx'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import * as Icon from '../icon'
import { Message } from '../message'
import { cancelCheckoutButton } from './cart'
import { primaryButtonClassName, secondaryButtonClassName } from './shared'

export const shippingView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [h.Class('grid gap-7')],
    [
      h.section(
        [h.AriaLabel('Contact information')],
        [
          h.div(
            [h.Class('border-b border-stone-300 pb-5')],
            [
              h.div(
                [
                  h.Class(
                    'text-xs font-bold uppercase tracking-widest text-stone-600',
                  ),
                ],
                ['Contact'],
              ),
              h.div(
                [h.Class('mt-2 text-sm font-medium text-stone-900')],
                ['alex.morgan@example.com'],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [h.AriaLabel('Delivery address')],
        [
          h.div(
            [
              h.Class(
                'grid gap-4 border-2 border-stone-900 bg-white p-5 sm:grid-cols-4',
              ),
            ],
            [
              h.div(
                [h.Class('sm:col-span-3')],
                [
                  h.div(
                    [h.Class('flex items-center gap-2')],
                    [
                      h.span(
                        [
                          h.Class(
                            'grid h-5 w-5 place-items-center rounded-full bg-stone-900 text-white',
                          ),
                        ],
                        [Icon.check('h-3 w-3')],
                      ),
                      h.h2(
                        [h.Class('text-sm font-bold text-stone-900')],
                        ['Saved address'],
                      ),
                    ],
                  ),
                  h.address(
                    [
                      h.Class(
                        'mt-3 text-sm not-italic leading-6 text-stone-600',
                      ),
                    ],
                    [
                      'Alex Morgan',
                      h.br([]),
                      '42 Market Street',
                      h.br([]),
                      'Brooklyn, NY 11201',
                      h.br([]),
                      'United States',
                    ],
                  ),
                ],
              ),
              h.div(
                [
                  h.Class(
                    'self-start text-xs font-bold uppercase tracking-wider text-orange-800',
                  ),
                ],
                ['Selected'],
              ),
            ],
          ),
        ],
      ),
      h.section(
        [h.AriaLabel('Delivery method')],
        [
          h.h2(
            [h.Class('text-sm font-bold text-stone-900')],
            ['Delivery method'],
          ),
          h.div(
            [
              h.Class(
                'mt-3 flex items-center justify-between gap-4 border border-stone-300 bg-stone-50 p-4',
              ),
            ],
            [
              h.div(
                [h.Class('flex items-center gap-3')],
                [
                  Icon.truck('h-6 w-6 text-stone-600'),
                  h.div(
                    [],
                    [
                      h.div(
                        [h.Class('text-sm font-bold text-stone-900')],
                        ['Standard tracked delivery'],
                      ),
                      h.div(
                        [h.Class('mt-1 text-xs text-stone-600')],
                        ['Estimated arrival: 4–6 business days'],
                      ),
                    ],
                  ),
                ],
              ),
              h.div([h.Class('text-sm font-bold text-stone-900')], ['Free']),
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
                  ['Back to bag'],
                ),
            },
            h,
          ),
          h.div([h.Class('sm:justify-self-center')], [cancelCheckoutButton(h)]),
          Button.view(
            {
              onClick: Message.ClickedContinue(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      clsx(primaryButtonClassName, 'sm:justify-self-end'),
                    ),
                  ],
                  ['Continue to payment', Icon.arrowRight()],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
import type { ApplicationViewBuilder } from '../composition'
