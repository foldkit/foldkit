import { clsx } from 'clsx'
import { Html, inertHtml as ih } from 'foldkit/html'

import {
  aboutRouter,
  contactRouter,
  contentApiRouter,
  privacyRouter,
} from '../route'

export const betaTag = ih.span(
  [
    ih.Class(
      'hidden sm:inline-block -rotate-6 rounded-xs bg-accent-700 dark:bg-accent-500 px-1 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
    ),
    ih.AriaLabel('Beta'),
  ],
  ['Beta'],
)

export const iconLink = (link: string, ariaLabel: string, icon: Html): Html =>
  ih.a(
    [
      ih.Href(link),
      ih.Class(
        'text-gray-700 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition',
      ),
      ih.AriaLabel(ariaLabel),
    ],
    [icon],
  )

export const headerGroupDivider = (className: string): Html =>
  ih.span([
    ih.AriaHidden(true),
    ih.Class(clsx('h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-800', className)),
  ])

export const skipNavLink: Html = ih.a(
  [
    ih.Href('#main-content'),
    ih.Class(
      'button-accent sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm',
    ),
  ],
  ['Skip to main content'],
)

const siteLinkClassName =
  'underline decoration-gray-400/40 dark:decoration-gray-500/40 hover:text-gray-800 dark:hover:text-gray-200 hover:decoration-gray-500 dark:hover:decoration-gray-300'

const siteLink = (href: string, label: string): Html =>
  ih.a([ih.Href(href), ih.Class(siteLinkClassName)], [label])

export const siteLinks: Html = ih.nav(
  [
    ih.AriaLabel('Site information'),
    ih.Class('mt-2 flex flex-wrap gap-x-4 gap-y-1'),
  ],
  [
    siteLink(aboutRouter(), 'About'),
    siteLink(contactRouter(), 'Contact'),
    siteLink(privacyRouter(), 'Privacy'),
    siteLink(contentApiRouter(), 'Content API'),
  ],
)
