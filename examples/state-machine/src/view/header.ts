import { clsx } from 'clsx'
import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import * as Icon from '../icon'
import { CheckoutState } from '../model'
import { currentProgressIndex, progressSteps } from './shared'

export const bookCoverView = (
  className: string,
  isCompact: boolean,
  h: ApplicationViewBuilder,
): Html => {
  const coverClassName = clsx(
    'relative grid content-start overflow-hidden bg-orange-800 text-orange-50',
    className,
    {
      'h-24 w-16 pt-2.5 pr-2 pb-2 pl-3 shadow-lg': isCompact,
      'h-40 w-30 p-4 pl-6 shadow-xl': !isCompact,
    },
  )
  const ruleClassName = clsx('w-1/4 bg-current', {
    'mb-1.5 h-px': isCompact,
    'mb-3 h-0.5': !isCompact,
  })
  const eyebrowClassName = clsx('font-extrabold uppercase tracking-widest', {
    hidden: isCompact,
    'origin-left scale-75 text-xs': !isCompact,
  })
  const titleClassName = clsx('font-serif leading-none tracking-tighter', {
    'mt-1 text-xs': isCompact,
    'mt-2 text-base': !isCompact,
  })
  const authorClassName = clsx('mt-auto font-bold uppercase tracking-wider', {
    hidden: isCompact,
    'origin-left scale-75 text-xs': !isCompact,
  })

  return h.div(
    [h.AriaHidden(true), h.Class(coverClassName)],
    [
      h.div([h.Class('absolute inset-y-0 left-3 w-px bg-orange-100/30')]),
      h.div([
        h.Class(
          'absolute inset-x-0 bottom-0 h-1 border-t border-stone-900/25 bg-orange-50',
        ),
      ]),
      h.div([h.Class(ruleClassName)]),
      h.div([h.Class(eyebrowClassName)], ['Signal Press']),
      h.div(
        [h.Class(titleClassName)],
        ['Designing', h.br([]), 'Durable', h.br([]), 'Interfaces'],
      ),
      h.div([h.Class(authorClassName)], ['Mira Chen']),
    ],
  )
}

export const pageHeaderView = (h: ApplicationViewBuilder): Html =>
  h.header(
    [h.Class('border-b border-stone-300 bg-stone-50')],
    [
      h.div(
        [
          h.Class(
            'mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-center gap-3')],
            [
              h.div(
                [
                  h.AriaHidden(true),
                  h.Class(
                    'grid h-9 w-9 place-items-center bg-stone-900 text-xs font-bold tracking-widest text-white',
                  ),
                ],
                ['SP'],
              ),
              h.div(
                [],
                [
                  h.div(
                    [
                      h.Class(
                        'text-sm font-bold uppercase tracking-widest text-stone-900',
                      ),
                    ],
                    ['Signal Press'],
                  ),
                  h.div(
                    [h.Class('hidden text-xs text-stone-600 sm:block')],
                    ['Independent books on design and technology'],
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex items-center gap-2 text-xs font-medium text-stone-600',
              ),
            ],
            [Icon.lockClosed(), 'Secure checkout'],
          ),
        ],
      ),
    ],
  )

export const progressIndicatorClassName = (
  isActive: boolean,
  isComplete: boolean,
  isSkipped: boolean,
): string => {
  const isCompleteOrSkipped = isComplete || isSkipped

  return clsx(
    'grid h-6 w-6 place-items-center rounded-full border-2 sm:h-7 sm:w-7',
    {
      'border-stone-900 bg-stone-900 text-white': isCompleteOrSkipped,
      'border-stone-900 bg-stone-50 text-stone-900':
        !isCompleteOrSkipped && isActive,
      'border-stone-300 bg-stone-50 text-stone-600':
        !isCompleteOrSkipped && !isActive,
    },
  )
}

export const progressView = (
  state: CheckoutState,
  h: ApplicationViewBuilder,
): Html => {
  const progressIndex = currentProgressIndex(state)

  return h.nav(
    [h.AriaLabel('Checkout progress'), h.Class('w-full pt-7 sm:pt-9')],
    [
      h.ol(
        [h.Class('grid grid-cols-4 gap-2 sm:gap-5')],
        Array.map(progressSteps, (stepLabel, index) => {
          const isActive = progressIndex === index
          const isComplete = progressIndex > index
          const isSkipped =
            stepLabel === 'Delivery' &&
            !state.isShippingRequired &&
            progressIndex > index
          const indicatorClassName = progressIndicatorClassName(
            isActive,
            isComplete,
            isSkipped,
          )

          return h.keyed('li')(
            stepLabel,
            [h.Class('min-w-0 border-t border-stone-300 pt-3')],
            [
              h.div(
                [h.Class('flex items-center gap-1 sm:gap-2')],
                [
                  h.span(
                    [h.Class(indicatorClassName)],
                    [
                      isComplete || isSkipped
                        ? Icon.check('h-3.5 w-3.5')
                        : String(index + 1),
                    ],
                  ),
                  h.span(
                    [
                      h.Class(
                        clsx('truncate text-xs sm:text-sm', {
                          'font-bold uppercase tracking-wider text-stone-900':
                            isActive,
                          'font-medium text-stone-600': !isActive,
                        }),
                      ),
                    ],
                    [isSkipped ? `${stepLabel} skipped` : stepLabel],
                  ),
                ],
              ),
            ],
          )
        }),
      ),
    ],
  )
}
import type { ApplicationViewBuilder } from '../composition'
