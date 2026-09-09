import { clsx } from 'clsx'
import { Option } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

import { formatStarCount } from '../githubStars'
import { Icon } from '../icon'
import {
  aboutRouter,
  contactRouter,
  contentApiRouter,
  privacyRouter,
} from '../route'

export const canaryBanner = (commit: string): Html => {
  const shortCommit = commit.slice(0, 7)

  return ih.aside(
    [
      ih.AriaLabel('Canary deployment'),
      ih.Class(
        'fixed bottom-3 left-1/2 z-[90] -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300 bg-amber-100/95 px-3 py-1.5 text-xs font-medium text-amber-950 shadow-lg backdrop-blur-sm dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100',
      ),
    ],
    [
      'Canary · Foldkit from main at ',
      ih.a(
        [
          ih.Href(`https://github.com/foldkit/foldkit/commit/${commit}`),
          ih.Class('font-mono underline hover:no-underline'),
        ],
        [shortCommit],
      ),
    ],
  )
}

export const betaTag: Html = ih.span(
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
        'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition',
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

const STAR_COUNT_MIN_WIDTH = 'min-w-[3ch]'

export const githubStarBadge = (
  maybeGitHubStarCount: Option.Option<number>,
): Html => {
  const badge = (label: Html): Html =>
    ih.span(
      [
        ih.Class(
          'inline-flex items-center gap-1 rounded-full bg-gray-900 dark:bg-white px-2 pt-0.5 pb-0.75 text-xs font-semibold text-white dark:text-gray-900',
        ),
        ih.AriaHidden(true),
      ],
      [
        Icon.star('w-3.5 h-3.5'),
        ih.span(
          [
            ih.Class(
              clsx(
                'mt-px inline-flex justify-center tabular-nums',
                STAR_COUNT_MIN_WIDTH,
              ),
            ),
          ],
          [label],
        ),
      ],
    )

  return Option.match(maybeGitHubStarCount, {
    onNone: () => ih.empty,
    onSome: count => badge(ih.span([], [formatStarCount(count)])),
  })
}

export const skipNavLink: Html = ih.a(
  [
    ih.Href('#main-content'),
    ih.Class(
      'button-accent sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm',
    ),
  ],
  ['Skip to main content'],
)

const BUTTONDOWN_SUBSCRIBE_URL =
  'https://buttondown.com/api/emails/embed-subscribe/foldkit'

// NOTE: Buttondown's embed endpoint only accepts native form submissions. A
// fetch request cannot hand the subscriber over when Buttondown needs them to
// solve a CAPTCHA or fix a rejected address, so this form posts straight to
// Buttondown and the browser follows the response into a new tab.
export const emailForm: Html = ih.form(
  [
    ih.Action(BUTTONDOWN_SUBSCRIBE_URL),
    ih.Method('post'),
    ih.Target('popupwindow'),
    ih.Class('flex flex-col sm:flex-row gap-3 max-w-md'),
  ],
  [
    ih.div(
      [ih.Class('flex-1')],
      [
        ih.input([
          ih.Type('email'),
          ih.Name('email'),
          ih.Required(true),
          ih.AriaLabel('Email address'),
          ih.Placeholder('you@example.com'),
          ih.Class(
            'w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400',
          ),
        ]),
      ],
    ),
    ih.button(
      [
        ih.Type('submit'),
        ih.Class('button-accent px-6 py-2.5 rounded-lg cursor-pointer'),
      ],
      ['Subscribe'],
    ),
  ],
)

// SITE LINKS

const siteLinkClassName =
  'underline decoration-gray-400/40 dark:decoration-gray-500/40 hover:text-gray-700 dark:hover:text-gray-200 hover:decoration-gray-500 dark:hover:decoration-gray-300'

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

export const emailSignupContent: Html = ih.div(
  [ih.Id('newsletter')],
  [
    ih.h2(
      [
        ih.Class(
          'font-heading font-book text-3xl md:text-4xl text-gray-900 dark:text-white mb-4 text-balance',
        ),
      ],
      ['Stay in the update loop.'],
    ),
    ih.p(
      [
        ih.Class(
          'text-base md:text-lg font-light text-gray-500 dark:text-gray-400 mb-8 max-w-xl',
        ),
      ],
      ['New releases, patterns, and the occasional deep dive.'],
    ),
    emailForm,
  ],
)
