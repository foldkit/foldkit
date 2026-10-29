import { clsx } from 'clsx'
import type { Html } from 'foldkit/html'

import type { Nav } from '@foldkit/ui'

import type { ApplicationViewBuilder } from '../composition'

const NAVIGATION_LINK_CLASS = 'block rounded-lg px-3 py-2 text-sm'

export const navigationLink = (
  item: Nav.ItemInfo,
  label: string,
  h: ApplicationViewBuilder,
): Html =>
  h.keyed('a')(
    item.value,
    [
      ...item.link,
      h.Class(
        clsx(NAVIGATION_LINK_CLASS, {
          'bg-white font-semibold text-indigo-700 shadow-xs': item.isCurrent,
          'font-medium text-slate-600 transition hover:bg-white/60 hover:text-slate-800':
            !item.isCurrent,
        }),
      ),
    ],
    [label],
  )
