import { Array, Option, Schema as S, pipe } from 'effect'
import { type Html, html } from 'foldkit/html'
import type { Url } from 'foldkit/url'

import { Nav } from '@foldkit/ui'

import { Icon } from '../../icon'
import type { TableOfContentsEntry } from '../../main'
import type { Message } from './message'

// TABLE OF CONTENTS

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic',
  text: 'Basic',
}

// DEMO CONTENT

const NavDemoSection = S.Literals(['Home', 'Search', 'Library', 'Profile'])
type NavDemoSection = typeof NavDemoSection.Type

const demoSections: ReadonlyArray<NavDemoSection> = [
  'Home',
  'Search',
  'Library',
  'Profile',
]

const NAV_SECTION_QUERY_KEY = 'section'

const defaultSection: NavDemoSection = 'Home'

const sectionToHref = (section: NavDemoSection): string =>
  `?${NAV_SECTION_QUERY_KEY}=${section.toLowerCase()}`

const sectionFromUrl = (url: Url): NavDemoSection =>
  pipe(
    url.search,
    Option.flatMapNullishOr(search =>
      new URLSearchParams(search).get(NAV_SECTION_QUERY_KEY),
    ),
    Option.flatMap(sectionParam =>
      Array.findFirst(
        demoSections,
        section => section.toLowerCase() === sectionParam.toLowerCase(),
      ),
    ),
    Option.getOrElse(() => defaultSection),
  )

const navClassName =
  'flex gap-1 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900'

const linkClassName =
  'flex-1 text-center px-2 sm:px-4 py-2 text-sm font-normal rounded-lg cursor-pointer transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-500/10 dark:hover:bg-gray-400/10 data-[current]:bg-cream data-[current]:dark:bg-gray-800 data-[current]:hover:bg-cream data-[current]:dark:hover:bg-gray-800 data-[current]:text-gray-900 data-[current]:dark:text-white data-[current]:shadow-sm'

// VIEW

const urlBar = (currentSection: NavDemoSection): Html => {
  const h = html<Message>()

  return h.div(
    [
      h.Class(
        'mt-3 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-3 py-2',
      ),
    ],
    [
      Icon.lockClosed('w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500'),
      h.span(
        [h.Class('font-mono text-sm')],
        [
          h.span([h.Class('text-gray-400 dark:text-gray-500')], ['myapp.dev/']),
          h.span(
            [h.Class('text-gray-700 dark:text-gray-200')],
            [sectionToHref(currentSection)],
          ),
        ],
      ),
    ],
  )
}

export const basicDemo = (url: Url) => {
  const h = html<Message>()

  const currentSection = sectionFromUrl(url)

  return [
    h.div(
      [h.Class('w-full max-w-lg mx-auto')],
      [
        Nav.view<NavDemoSection>({
          items: demoSections,
          ariaLabel: 'App sections',
          toHref: sectionToHref,
          isItemCurrent: section => section === currentSection,
          toView: ({ nav, items }) =>
            h.nav(
              [...nav, h.Class(navClassName)],
              items.map(item =>
                h.a(
                  [...item.link, h.Class(linkClassName)],
                  [h.span([], [item.value])],
                ),
              ),
            ),
        }),
        urlBar(currentSection),
      ],
    ),
  ]
}
