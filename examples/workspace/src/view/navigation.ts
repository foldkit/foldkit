import { clsx } from 'clsx'
import type { Html } from 'foldkit/html'

import type { ApplicationViewBuilder } from '../composition'

const NAVIGATION_LINK_CLASS = 'block rounded-lg px-3 py-2 text-sm'

export const navigationLink = (
  href: string,
  label: string,
  isActive: boolean,
  h: ApplicationViewBuilder,
): Html =>
  h.a(
    [
      h.Href(href),
      h.Class(
        clsx(NAVIGATION_LINK_CLASS, {
          'bg-white font-semibold text-indigo-700 shadow-xs': isActive,
          'font-medium text-slate-600 transition hover:bg-white/60 hover:text-slate-800':
            !isActive,
        }),
      ),
      ...(isActive ? [h.AriaCurrent('page')] : []),
    ],
    [label],
  )
