import { clsx } from 'clsx'
import { Array, Option, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Html, createLazy } from 'foldkit/html'

import { type NavPage, docsSections, isNavPageActive } from '../docsNav'
import {
  Alt,
  AriaCurrent,
  AriaLabel,
  Autofocus,
  Class,
  Href,
  OnClick,
  Src,
  Tabindex,
  a,
  aside,
  button,
  div,
  img,
  li,
  nav,
  span,
  ul,
} from '../html'
import { Icon } from '../icon'
import { Link } from '../link'
import { type Model } from '../main'
import {
  GotAiGroupMessage,
  GotApiReferenceGroupMessage,
  GotBestPracticesGroupMessage,
  GotCoreConceptsGroupMessage,
  GotExamplesGroupMessage,
  GotFoldkitUiGroupMessage,
  GotGetStartedGroupMessage,
  GotGuidesGroupMessage,
  GotMobileMenuDialogMessage,
  GotPatternsGroupMessage,
  type Message,
} from '../message'
import * as Page from '../page'
import { ExampleDetailRoute, apiModuleRouter, homeRouter } from '../route'
import { betaTag, iconLink } from './shared'

const sidebarGroup = (config: {
  readonly label: string
  readonly model: Ui.Disclosure.Model
  readonly toParentMessage: (message: Ui.Disclosure.Message) => Message
  readonly children: Html
}): Html =>
  li(
    [],
    [
      Ui.Disclosure.view({
        model: config.model,
        toParentMessage: config.toParentMessage,
        buttonAttributes: [
          Class(
            clsx(
              'w-full flex items-center justify-between cursor-pointer transition',
              'px-4 py-2.5 md:py-2',
              'text-xs font-semibold uppercase tracking-wider',
              'text-gray-600 dark:text-gray-400',
              'bg-gray-200 dark:bg-gray-800',
              'hover:bg-gray-300/60 dark:hover:bg-gray-700/60',
              'hover:text-gray-700 dark:hover:text-gray-300',
            ),
          ),
        ],
        buttonContent: div(
          [Class('flex items-center justify-between w-full')],
          [
            span([], [config.label]),
            span(
              [
                Class(
                  clsx({
                    'rotate-180': config.model.isOpen,
                  }),
                ),
              ],
              [Icon.chevronDown('w-3 h-3')],
            ),
          ],
        ),
        panelAttributes: [Class('px-4 py-2')],
        panelContent: config.children,
      }),
    ],
  )

const sidebarViewInner = (
  route: Model['route'],
  getStartedGroup: Ui.Disclosure.Model,
  coreConceptsGroup: Ui.Disclosure.Model,
  guidesGroup: Ui.Disclosure.Model,
  bestPracticesGroup: Ui.Disclosure.Model,
  patternsGroup: Ui.Disclosure.Model,
  examplesGroup: Ui.Disclosure.Model,
  foldkitUiGroup: Ui.Disclosure.Model,
  aiGroup: Ui.Disclosure.Model,
  apiReferenceGroup: Ui.Disclosure.Model,
  mobileMenuDialog: Ui.Dialog.Model,
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

  const navLink = (href: string, isActive: boolean, label: string) =>
    li(
      [],
      [
        a(
          [
            Href(href),
            Class(linkClass(isActive)),
            ...(isActive ? [AriaCurrent('page')] : []),
          ],
          [label],
        ),
      ],
    )

  const sectionDisclosures: ReadonlyArray<
    Readonly<{
      model: Ui.Disclosure.Model
      toParentMessage: (message: Ui.Disclosure.Message) => Message
    }>
  > = [
    {
      model: getStartedGroup,
      toParentMessage: message => GotGetStartedGroupMessage({ message }),
    },
    {
      model: coreConceptsGroup,
      toParentMessage: message => GotCoreConceptsGroupMessage({ message }),
    },
    {
      model: guidesGroup,
      toParentMessage: message => GotGuidesGroupMessage({ message }),
    },
    {
      model: bestPracticesGroup,
      toParentMessage: message => GotBestPracticesGroupMessage({ message }),
    },
    {
      model: patternsGroup,
      toParentMessage: message => GotPatternsGroupMessage({ message }),
    },
    {
      model: examplesGroup,
      toParentMessage: message => GotExamplesGroupMessage({ message }),
    },
    {
      model: foldkitUiGroup,
      toParentMessage: message => GotFoldkitUiGroupMessage({ message }),
    },
    {
      model: aiGroup,
      toParentMessage: message => GotAiGroupMessage({ message }),
    },
  ]

  const pageGroupList = (pages: ReadonlyArray<NavPage>): Html =>
    ul(
      [Class('space-y-0.5')],
      Array.map(pages, page =>
        navLink(
          page.href,
          isNavPageActive(route._tag, maybeExampleSlug, page._tag),
          page.label,
        ),
      ),
    )

  const navLinks = ul(
    [Class('space-y-0.5')],
    [
      ...Array.zipWith(
        docsSections,
        sectionDisclosures,
        (section, disclosure) =>
          sidebarGroup({
            label: section.label,
            model: disclosure.model,
            toParentMessage: disclosure.toParentMessage,
            children: div(
              [Class('divide-y divide-gray-200 dark:divide-gray-800')],
              Array.map(section.pageGroups, group =>
                div(
                  [Class('py-2 first:pt-0 last:pb-0')],
                  [pageGroupList(group)],
                ),
              ),
            ),
          }),
      ),
      sidebarGroup({
        label: 'API Reference',
        model: apiReferenceGroup,
        toParentMessage: message => GotApiReferenceGroupMessage({ message }),
        children: ul(
          [Class('space-y-0.5')],
          Array.map(Page.ApiReference.moduleSlugs, ({ slug, name }) =>
            navLink(
              apiModuleRouter({
                moduleSlug: slug,
              }),
              isOnApiModulePage && route.moduleSlug === slug,
              name,
            ),
          ),
        ),
      }),
    ],
  )

  const desktopSidebar = aside(
    [
      AriaLabel('Documentation sidebar'),
      Class(
        'hidden md:flex fixed top-[var(--header-height)] bottom-0 left-0 z-40 w-64 bg-cream dark:bg-gray-900 border-r border-gray-300 dark:border-gray-800 flex-col',
      ),
    ],
    [
      nav(
        [AriaLabel('Documentation'), Class('flex-1 overflow-y-auto pb-4')],
        [navLinks],
      ),
    ],
  )

  const mobileMenuContent = div(
    [Class('flex flex-col h-full')],
    [
      div(
        [
          Class(
            'flex justify-between items-center h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] px-3 border-b border-gray-300 dark:border-gray-800 shrink-0',
          ),
        ],
        [
          a(
            [Href(homeRouter()), Class('flex items-center gap-2')],
            [
              img([Src('/logo.svg'), Alt('Foldkit'), Class('h-6 dark:invert')]),
              betaTag,
            ],
          ),
          button(
            [
              Class(
                'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              AriaLabel('Close menu'),
              OnClick(
                GotMobileMenuDialogMessage({
                  message: Ui.Dialog.Closed(),
                }),
              ),
            ],
            [Icon.close('w-6 h-6')],
          ),
        ],
      ),
      nav(
        [
          AriaLabel('Documentation'),
          Class('flex-1 overflow-y-auto'),
          Tabindex(-1),
          Autofocus(true),
        ],
        [navLinks],
      ),
      div(
        [Class('p-4 border-t border-gray-300 dark:border-gray-800 shrink-0')],
        [
          div(
            [Class('flex items-center justify-center gap-8')],
            [
              iconLink(Link.github, 'GitHub', Icon.github('w-6 h-6')),
              iconLink(Link.npm, 'npm', Icon.npm('w-8 h-8')),
            ],
          ),
        ],
      ),
    ],
  )

  const mobileMenu = Ui.Dialog.view({
    model: mobileMenuDialog,
    toParentMessage: message => GotMobileMenuDialogMessage({ message }),
    panelContent: mobileMenuContent,
    panelAttributes: [
      Class('fixed inset-0 z-[60] bg-cream dark:bg-gray-900 flex flex-col'),
    ],
    backdropAttributes: [Class('fixed inset-0 z-[59]')],
    attributes: [Class('md:hidden')],
  })

  return div([], [desktopSidebar, mobileMenu])
}

const lazySidebar = createLazy()

export const sidebarView = (model: Model): Html =>
  lazySidebar(sidebarViewInner, [
    model.route,
    model.getStartedGroup,
    model.coreConceptsGroup,
    model.guidesGroup,
    model.bestPracticesGroup,
    model.patternsGroup,
    model.examplesGroup,
    model.foldkitUiGroup,
    model.aiGroup,
    model.apiReferenceGroup,
    model.mobileMenuDialog,
  ])
