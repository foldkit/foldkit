import { clsx } from 'clsx'
import type { Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import * as Icon from '../icon'
import { Message } from '../message'
import type { ConfirmedState } from '../model'
import { primaryButtonClassName } from './shared'

export const placingView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Role('status'),
      h.AriaLive('polite'),
      h.Class('grid min-h-72 place-items-center text-center'),
    ],
    [
      h.div(
        [],
        [
          h.div([
            h.Class(
              'mx-auto h-12 w-12 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 motion-reduce:animate-none',
            ),
          ]),
          h.p(
            [h.Class('mt-6 text-sm leading-6 text-stone-600')],
            ['Authorizing payment and reserving your copy…'],
          ),
        ],
      ),
    ],
  )

export const confirmedView = (
  state: ConfirmedState,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [
      h.Class(
        'grid min-h-80 content-center justify-items-center py-8 text-center',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'grid h-14 w-14 place-items-center rounded-full bg-stone-900 text-white',
          ),
        ],
        [Icon.check('h-7 w-7')],
      ),
      h.h2(
        [h.Class('mt-6 font-serif text-3xl text-stone-900')],
        [`Order ${state.orderId} confirmed`],
      ),
      h.p(
        [h.Class('mt-3 max-w-md text-sm leading-6 text-stone-600')],
        [
          state.isShippingRequired
            ? 'We’ll email tracking details when your hardcover leaves the press.'
            : 'Your PDF and EPUB download links are on their way to alex.morgan@example.com.',
        ],
      ),
      h.div(
        [
          h.Class(
            'mt-7 border-y border-stone-300 px-8 py-4 text-xs font-bold uppercase tracking-widest text-stone-600',
          ),
        ],
        [`Order reference · ${state.orderId}`],
      ),
      Button.view(
        {
          onClick: Message.ClickedStartOver(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(clsx(primaryButtonClassName, 'mt-7')),
              ],
              ['Return to checkout'],
            ),
        },
        h,
      ),
    ],
  )

export const cancelledView = (h: ApplicationViewBuilder): Html =>
  h.div(
    [
      h.Class(
        'grid min-h-72 content-center justify-items-center py-8 text-center',
      ),
    ],
    [
      h.div(
        [
          h.AriaHidden(true),
          h.Class(
            'grid h-14 w-14 place-items-center rounded-full border border-stone-400 font-serif text-2xl text-stone-500',
          ),
        ],
        ['×'],
      ),
      h.p(
        [h.Class('mt-6 max-w-md text-sm leading-6 text-stone-600')],
        [
          'Your checkout was cancelled before payment. You can begin again whenever you’re ready.',
        ],
      ),
      Button.view(
        {
          onClick: Message.ClickedStartOver(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(clsx(primaryButtonClassName, 'mt-7')),
              ],
              ['Start checkout again'],
            ),
        },
        h,
      ),
    ],
  )
import type { ApplicationViewBuilder } from '../composition'
