import { clsx } from 'clsx'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

export const primaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-sm bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500'

export const secondaryButtonClassName =
  'inline-flex min-h-12 cursor-pointer items-center justify-center whitespace-nowrap rounded-sm border border-stone-400 bg-transparent px-5 py-3 text-sm font-semibold text-stone-900 transition-colors hover:border-stone-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900'

const cancelButtonClassName =
  'cursor-pointer text-sm font-medium text-stone-600 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-900'

export const bookCoverView = <Message>(
  className: string,
  isCompact: boolean,
  h: HtmlBuilder<Message>,
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

export const cancelCheckoutButtonView = <Message>(
  onClick: Message,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      onClick,
      toView: attributes =>
        h.button(
          [...attributes.button, h.Class(cancelButtonClassName)],
          ['Cancel checkout'],
        ),
    },
    h,
  )
