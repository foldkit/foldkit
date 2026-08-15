import { clsx } from 'clsx'
import { Array, Equal, Option, pipe } from 'effect'
import { Html, type HtmlBuilder, createKeyedLazy } from 'foldkit/html'
import apiModuleIndex from 'virtual:api-module-index'

import { Dialog, Disclosure } from '@foldkit/ui'

import {
  DOCS_SIDEBAR_NAV_ID,
  MOBILE_MENU_NAV_ID,
  type NavPage,
  docsSections,
  findActiveSectionKey,
  isNavPageActive,
} from '../docsNav'
import { Icon } from '../icon'
import { Link } from '../link'
import { type Model } from '../main'
import {
  GotMobileMenuDialogMessage,
  type Message,
  ToggledSidebarGroup,
} from '../message'
import {
  ExampleDetailRoute,
  apiModuleRouter,
  blogRouter,
  homeRouter,
  isBlogRoute,
} from '../route'
import { type GroupKey, type SidebarGroups } from '../sidebarStorage'
import { betaTag, iconLink } from './shared'

const GROUP_ID: Record<GroupKey, string> = {
  getStarted: 'get-started-group',
  coreConcepts: 'core-concepts-group',
  comparisons: 'comparisons-group',
  faq: 'faq-group',
  testing: 'testing-group',
  bestPractices: 'best-practices-group',
  patterns: 'patterns-group',
  tooling: 'tooling-group',
  foldkitUi: 'foldkit-ui-group',
  ai: 'ai-group',
  examples: 'examples-group',
  apiReference: 'api-reference-group',
}

const sidebarGroup = (
  config: {
    readonly id: string
    readonly label: string
    readonly isOpen: boolean
    readonly onToggle: (isOpen: boolean) => Message
    readonly children: Html
    readonly isLocked: boolean
  },
  h: HtmlBuilder<Message>,
): Html => {
  const buttonClassName = clsx(
    'w-full flex items-center justify-between transition',
    'px-4 py-2.5 md:py-2',
    'text-xs font-semibold uppercase tracking-wider',
    'text-gray-600 dark:text-gray-400',
    'bg-gray-200 dark:bg-gray-800',
    {
      'cursor-default': config.isLocked,
      'cursor-pointer hover:bg-gray-300/60 dark:hover:bg-gray-700/60 hover:text-gray-700 dark:hover:text-gray-300':
        !config.isLocked,
    },
  )

  return h.li(
    [],
    [
      Disclosure.view(
        {
          id: config.id,
          isOpen: config.isOpen,
          onToggle: config.onToggle,
          isDisabled: config.isLocked,
          toView: attributes =>
            h.div(
              [],
              [
                h.button(
                  [...attributes.button, h.Class(buttonClassName)],
                  [
                    h.div(
                      [h.Class('flex items-center justify-between w-full')],
                      [
                        h.span([], [config.label]),
                        config.isLocked
                          ? h.empty
                          : h.span(
                              [
                                h.Class(
                                  clsx({
                                    'rotate-180': config.isOpen,
                                  }),
                                ),
                              ],
                              [Icon.chevronDown('w-3 h-3')],
                            ),
                      ],
                    ),
                  ],
                ),
                config.isOpen
                  ? h.div(
                      [...attributes.panel, h.Class('px-4 py-2')],
                      [config.children],
                    )
                  : h.empty,
              ],
            ),
        },
        h,
      ),
    ],
  )
}

const linkClass = (isActive: boolean) =>
  clsx(
    'block px-4 py-2.5 md:px-2.5 md:py-1 rounded-md transition text-sm font-normal',
    {
      'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-400':
        isActive,
      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800':
        !isActive,
    },
  )

const navLink = (
  href: string,
  isActive: boolean,
  label: string,
  h: HtmlBuilder<Message>,
) =>
  h.li(
    [],
    [
      h.a(
        [
          h.Href(href),
          h.Class(linkClass(isActive)),
          ...(isActive ? [h.AriaCurrent('page')] : []),
        ],
        [label],
      ),
    ],
  )

const computeNavLinks = (
  idPrefix: string,
  route: Model['route'],
  sidebarGroups: SidebarGroups,
  h: HtmlBuilder<Message>,
): Html => {
  const isOnApiModulePage = route._tag === 'ApiModule'
  const maybeExampleSlug = pipe(
    route,
    Option.liftPredicate(
      (route): route is typeof ExampleDetailRoute.Type =>
        route._tag === 'ExampleDetail',
    ),
    Option.map(route => route.exampleSlug),
  )
  const maybeActiveSectionKey = findActiveSectionKey(
    route._tag,
    maybeExampleSlug,
  )
  const isLocked = (key: GroupKey): boolean =>
    Option.exists(maybeActiveSectionKey, Equal.equals(key))

  const pageGroupList = (pages: ReadonlyArray<NavPage>): Html =>
    h.ul(
      [h.Class('space-y-0.5')],
      Array.map(pages, page =>
        navLink(
          page.href,
          isNavPageActive(route._tag, maybeExampleSlug, page._tag),
          page.label,
          h,
        ),
      ),
    )

  return h.ul(
    [h.Class('space-y-0.5')],
    [
      ...Array.map(docsSections, section => {
        return sidebarGroup(
          {
            id: `${idPrefix}-${GROUP_ID[section.key]}`,
            label: section.label,
            isOpen: sidebarGroups[section.key],
            onToggle: isOpen =>
              ToggledSidebarGroup({ key: section.key, isOpen }),
            isLocked: isLocked(section.key),
            children: h.div(
              [h.Class('divide-y divide-gray-200 dark:divide-gray-800')],
              Array.map(section.pageGroups, group =>
                h.div(
                  [h.Class('py-2 first:pt-0 last:pb-0')],
                  [pageGroupList(group)],
                ),
              ),
            ),
          },
          h,
        )
      }),
      sidebarGroup(
        {
          id: `${idPrefix}-${GROUP_ID.apiReference}`,
          label: 'API Reference',
          isOpen: sidebarGroups.apiReference,
          onToggle: isOpen =>
            ToggledSidebarGroup({ key: 'apiReference', isOpen }),
          isLocked: isLocked('apiReference'),
          children: h.ul(
            [h.Class('space-y-0.5')],
            Array.map(apiModuleIndex, ({ slug, name }) =>
              navLink(
                apiModuleRouter({
                  moduleSlug: slug,
                }),
                isOnApiModulePage && route.moduleSlug === slug,
                name,
                h,
              ),
            ),
          ),
        },
        h,
      ),
    ],
  )
}

const blogSectionHeaderClassName = clsx(
  'w-full flex items-center justify-between transition cursor-default',
  'px-4 py-2.5 md:py-2',
  'text-xs font-semibold uppercase tracking-wider',
  'text-gray-600 dark:text-gray-400',
  'bg-gray-200 dark:bg-gray-800',
)

const blogSection = (route: Model['route'], h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.div([h.Class(blogSectionHeaderClassName)], ['Blog']),
      h.div(
        [h.Class('px-4 py-2')],
        [
          h.ul(
            [h.Class('space-y-0.5')],
            [navLink(blogRouter(), isBlogRoute(route), 'Posts', h)],
          ),
        ],
      ),
    ],
  )

const DESKTOP_ID_PREFIX = 'desktop'
const MOBILE_ID_PREFIX = 'mobile'

const lazyNavLinks = createKeyedLazy()

export const sidebarView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const desktopNavLinks = lazyNavLinks(DESKTOP_ID_PREFIX, computeNavLinks, [
    DESKTOP_ID_PREFIX,
    model.route,
    model.sidebarGroups,
    h,
  ])

  return h.aside(
    [
      h.AriaLabel('Documentation sidebar'),
      h.Class(
        'hidden md:flex fixed top-[var(--header-height)] bottom-0 left-0 z-40 w-64 bg-cream dark:bg-gray-900 border-r border-gray-300 dark:border-gray-800 flex-col',
      ),
    ],
    [
      h.nav(
        [
          h.AriaLabel('Documentation'),
          h.Id(DOCS_SIDEBAR_NAV_ID),
          h.Class('flex-1 overflow-y-auto pb-4'),
        ],
        [desktopNavLinks],
      ),
    ],
  )
}

export const mobileMenuView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const mobileNavLinks = lazyNavLinks(MOBILE_ID_PREFIX, computeNavLinks, [
    MOBILE_ID_PREFIX,
    model.route,
    model.sidebarGroups,
    h,
  ])

  const mobileMenuContent = (
    closeButton: Dialog.RenderInfo['closeButton'],
  ): Html =>
    h.div(
      [h.Class('flex flex-col h-full')],
      [
        h.div(
          [
            h.Class(
              'flex justify-between items-center h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] px-4 border-b border-gray-300 dark:border-gray-800 shrink-0',
            ),
          ],
          [
            h.a(
              [h.Href(homeRouter()), h.Class('flex items-center gap-2')],
              [
                h.img([
                  h.Src('/logo.svg'),
                  h.Alt('Foldkit'),
                  h.Width('801'),
                  h.Height('200'),
                  h.Decoding('sync'),
                  h.Class('h-6 w-auto dark:invert'),
                ]),
                betaTag,
              ],
            ),
            h.button(
              [
                ...closeButton,
                h.Class(
                  'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
                ),
                h.AriaLabel('Close menu'),
              ],
              [Icon.close('w-6 h-6')],
            ),
          ],
        ),
        h.nav(
          [
            h.AriaLabel('Documentation'),
            h.Id(MOBILE_MENU_NAV_ID),
            h.Class('flex-1 overflow-y-auto'),
            h.Tabindex(-1),
            h.Autofocus(true),
          ],
          [blogSection(model.route, h), mobileNavLinks],
        ),
        h.div(
          [
            h.Class(
              'p-4 border-t border-gray-300 dark:border-gray-800 shrink-0',
            ),
          ],
          [
            h.div(
              [h.Class('flex items-center justify-center gap-8')],
              [
                iconLink(Link.github, 'GitHub', Icon.github('w-6 h-6')),
                iconLink(Link.discord, 'Discord', Icon.discord('w-6 h-6')),
                iconLink(Link.xSocial, 'X', Icon.xSocial('w-6 h-6')),
                iconLink(Link.npm, 'npm', Icon.npm('w-8 h-8')),
              ],
            ),
          ],
        ),
      ],
    )

  return h.submodel({
    slotId: model.mobileMenuDialog.id,
    model: model.mobileMenuDialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, closeButton, isVisible }) =>
        h.dialog(
          [...dialog, h.Class('md:hidden')],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 z-[59]')]),
                h.div(
                  [
                    ...panel,
                    h.Class(
                      'fixed inset-0 z-[60] bg-cream dark:bg-gray-900 flex flex-col',
                    ),
                  ],
                  [mobileMenuContent(closeButton)],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => GotMobileMenuDialogMessage({ message }),
  })
}
