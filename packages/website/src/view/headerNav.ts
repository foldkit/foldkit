import { Match as M, Schema as S } from 'effect'
import { Html, type HtmlBuilder } from 'foldkit/html'

import { Nav } from '@foldkit/ui'

import { type Message } from '../message'
import {
  type AppRoute,
  blogRouter,
  coreArchitectureRouter,
  isBlogRoute,
} from '../route'

// HEADER NAV

const HeaderSection = S.Literals(['Docs', 'Blog'])
type HeaderSection = typeof HeaderSection.Type

const headerSections: ReadonlyArray<HeaderSection> = HeaderSection.literals

const NON_DOCS_ROUTE_TAGS: ReadonlySet<AppRoute['_tag']> = new Set([
  'Home',
  'Newsletter',
  'Playground',
  'Blog',
  'BlogPost',
  'NotFound',
])

const isSectionCurrent = (route: AppRoute, section: HeaderSection): boolean =>
  M.value(section).pipe(
    M.when('Docs', () => !NON_DOCS_ROUTE_TAGS.has(route._tag)),
    M.when('Blog', () => isBlogRoute(route)),
    M.exhaustive,
  )

const sectionToHref = (section: HeaderSection): string =>
  M.value(section).pipe(
    M.when('Docs', () => coreArchitectureRouter()),
    M.when('Blog', () => blogRouter()),
    M.exhaustive,
  )

const linkClassName =
  'text-sm text-gray-700 dark:text-gray-300 underline decoration-2 underline-offset-4 decoration-transparent transition hover:text-gray-900 dark:hover:text-white hover:decoration-gray-300 dark:hover:decoration-gray-600 data-[current]:text-accent-700 data-[current]:dark:text-accent-400 data-[current]:decoration-accent-600 data-[current]:dark:decoration-accent-400 data-[current]:hover:text-accent-700 data-[current]:hover:decoration-accent-600 data-[current]:dark:hover:text-accent-400 data-[current]:dark:hover:decoration-accent-400'

/**
 * The site's primary section links, shared by the landing and docs headers.
 * The current section is derived from the route, so `Docs` stays highlighted
 * anywhere inside the documentation and `Blog` across the index and posts.
 * `className` lays the `nav` element out in its host header.
 */
export const headerNavView = (
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
