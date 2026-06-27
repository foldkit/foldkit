import { html } from 'foldkit/html'

import { Nav } from '@foldkit/ui'

import type { TableOfContentsEntry } from '../../main'
import { ClickedNavDemoSection, type Message } from './message'
import type { NavDemoSection } from './model'

// TABLE OF CONTENTS

export const basicHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'basic',
  text: 'Basic',
}

// DEMO CONTENT

const demoSections: ReadonlyArray<NavDemoSection> = [
  'Home',
  'Search',
  'Library',
  'Profile',
]

const sectionHref = (section: NavDemoSection): string =>
  `#${section.toLowerCase()}`

const navClassName =
  'flex gap-1 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900'

const linkClassName =
  'flex-1 text-center px-4 py-2 text-sm font-normal rounded-lg cursor-pointer transition text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 data-[current]:bg-cream data-[current]:dark:bg-gray-800 data-[current]:text-gray-900 data-[current]:dark:text-white data-[current]:shadow-sm'

// VIEW

export const basicDemo = (currentSection: NavDemoSection) => {
  const h = html<Message>()

  return [
    h.div(
      [h.Class('max-w-md mx-auto')],
      [
        Nav.view<NavDemoSection>({
          items: demoSections,
          ariaLabel: 'App sections',
          toHref: sectionHref,
          isItemCurrent: section => section === currentSection,
          toView: ({ nav, items }) =>
            h.nav(
              [...nav, h.Class(navClassName)],
              items.map(item =>
                h.a(
                  [
                    ...item.link,
                    h.OnClick(ClickedNavDemoSection({ section: item.value })),
                    h.Class(linkClassName),
                  ],
                  [h.span([], [item.value])],
                ),
              ),
            ),
        }),
      ],
    ),
  ]
}
