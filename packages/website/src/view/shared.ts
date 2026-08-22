import { clsx } from 'clsx'
import { Option } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

import { formatStarCount } from '../githubStars'
import { Icon } from '../icon'

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
      'hidden sm:inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
    ),
    ih.AriaLabel('Beta'),
  ],
  ['Beta'],
)

export const iconLink = (link: string, ariaLabel: string, icon: Html) =>
  ih.a(
    [
      ih.Href(link),
      ih.Class(
        'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition',
      ),
      ih.AriaLabel(ariaLabel),
    ],
    [icon],
  )

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
      'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-600 dark:focus:bg-accent-500 focus:text-white focus:text-sm focus:font-normal',
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
export const emailFormView: Html = ih.form(
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
        ih.Class(
          'px-6 py-2.5 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600 cursor-pointer',
        ),
      ],
      ['Subscribe'],
    ),
  ],
)

export const emailSignupContentView: Html = ih.div(
  [ih.Id('newsletter')],
  [
    ih.h2(
      [
        ih.Class(
          'text-3xl md:text-4xl font-normal text-gray-900 dark:text-white mb-4 text-balance',
        ),
      ],
      ['Stay in the update loop.'],
    ),
    ih.p(
      [ih.Class('text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl')],
      ['New releases, patterns, and the occasional deep dive.'],
    ),
    emailFormView,
  ],
)
