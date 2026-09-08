import { Match, Schema } from 'effect'
import { Html, type HtmlBuilder } from 'foldkit/html'

import { Nav } from '@foldkit/ui'

import { type Message } from '../message'
import {
  type AppRoute,
  blogRouter,
  coreArchitectureRouter,
  isBlogRoute,
  isDocsSectionRoute,
} from '../route'

const HeaderSection = Schema.Literals(['Docs', 'Blog'])
type HeaderSection = typeof HeaderSection.Type

const headerSections: ReadonlyArray<HeaderSection> = HeaderSection.literals

const isSectionCurrent = (route: AppRoute, section: HeaderSection): boolean =>
  Match.value(section).pipe(
    Match.when('Docs', () => isDocsSectionRoute(route)),
    Match.when('Blog', () => isBlogRoute(route)),
    Match.exhaustive,
  )

const sectionToHref = (section: HeaderSection): string =>
  Match.value(section).pipe(
    Match.when('Docs', () => coreArchitectureRouter()),
    Match.when('Blog', () => blogRouter()),
    Match.exhaustive,
  )

const linkClassName =
  'text-sm font-normal text-gray-500 dark:text-gray-400 transition hover:text-gray-700 dark:hover:text-gray-300 data-[current]:font-medium data-[current]:text-accent-700 data-[current]:dark:text-accent-400 data-[current]:hover:text-accent-700 data-[current]:dark:hover:text-accent-400'

export const view = (
  route: AppRoute,
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  Nav.view<HeaderSection>({
    items: headerSections,
    ariaLabel: 'Primary',
    toHref: sectionToHref,
    isItemCurrent: section => isSectionCurrent(route, section),
    toView: ({ nav, items }) =>
      h.nav(
        [...nav, h.Class(className)],
        items.map(item =>
          h.a([...item.link, h.Class(linkClassName)], [item.value]),
        ),
      ),
  })
