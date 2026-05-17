import { clsx } from 'clsx'
import {
  Array,
  Duration,
  Effect,
  Option,
  Queue,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { Mount, Ui } from 'foldkit'
import { Html, createLazy, html } from 'foldkit/html'
import apiModuleIndex from 'virtual:api-module-index'

import { type NavPage, docsSections, isNavPageActive } from '../docsNav'
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
  GotForReactDevelopersGroupMessage,
  GotGetStartedGroupMessage,
  GotGuidesGroupMessage,
  GotMobileMenuDialogMessage,
  GotPatternsGroupMessage,
  GotTestingGroupMessage,
  type Message,
  ScrolledSidebar,
} from '../message'
import { ExampleDetailRoute, apiModuleRouter, homeRouter } from '../route'
import { betaTag, iconLink } from './shared'

export const DOCS_SIDEBAR_NAV_ID = 'docs-sidebar-nav'

const SCROLL_DEBOUNCE_DURATION = Duration.millis(150)

/** Combined Mount that restores the sidebar's scroll position on first mount
 *  and emits debounced `ScrolledSidebar` Messages over the element's lifetime.
 *  Bundling restore + listen into one Mount is forced by snabbdom's one-Mount-
 *  per-element constraint; the scroll restore is a side effect of `acquire`,
 *  and the scroll listener is the persistent work the Mount performs over the
 *  element's lifetime. */
const SyncSidebarScroll = Mount.defineStream(
  'SyncSidebarScroll',
  { initialScroll: S.Number },
  ScrolledSidebar,
)(
  ({ initialScroll }) =>
    element =>
      Stream.callback<typeof ScrolledSidebar.Type>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              element.scrollTop = initialScroll
              const handler = () =>
                Queue.offerUnsafe(
                  queue,
                  ScrolledSidebar({ scroll: element.scrollTop }),
                )
              element.addEventListener('scroll', handler, { passive: true })
              return handler
            }),
            handler =>
              Effect.sync(() => element.removeEventListener('scroll', handler)),
          )
          return yield* Effect.never
        }),
      ).pipe(Stream.debounce(SCROLL_DEBOUNCE_DURATION)),
)

const sidebarGroup = (config: {
  readonly label: string
  readonly model: Ui.Disclosure.Model
  readonly toParentMessage: (message: Ui.Disclosure.Message) => Message
  readonly children: Html
}): Html => {
  const h = html<Message>()

  return h.li(
    [],
    [
      Ui.Disclosure.view({
        model: config.model,
        toParentMessage: config.toParentMessage,
        buttonAttributes: [
          h.Class(
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
        buttonContent: h.div(
          [h.Class('flex items-center justify-between w-full')],
          [
            h.span([], [config.label]),
            h.span(
              [
                h.Class(
                  clsx({
                    'rotate-180': config.model.isOpen,
                  }),
                ),
              ],
              [Icon.chevronDown('w-3 h-3')],
            ),
          ],
        ),
        panelAttributes: [h.Class('px-4 py-2')],
        panelContent: config.children,
      }),
    ],
  )
}

const computeNavLinks = (
  route: Model['route'],
  getStartedGroup: Ui.Disclosure.Model,
  coreConceptsGroup: Ui.Disclosure.Model,
  forReactDevelopersGroup: Ui.Disclosure.Model,
  guidesGroup: Ui.Disclosure.Model,
  testingGroup: Ui.Disclosure.Model,
  bestPracticesGroup: Ui.Disclosure.Model,
  patternsGroup: Ui.Disclosure.Model,
  examplesGroup: Ui.Disclosure.Model,
  foldkitUiGroup: Ui.Disclosure.Model,
  aiGroup: Ui.Disclosure.Model,
  apiReferenceGroup: Ui.Disclosure.Model,
): Html => {
  const h = html<Message>()

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
      model: forReactDevelopersGroup,
      toParentMessage: message =>
        GotForReactDevelopersGroupMessage({ message }),
    },
    {
      model: guidesGroup,
      toParentMessage: message => GotGuidesGroupMessage({ message }),
    },
    {
      model: testingGroup,
      toParentMessage: message => GotTestingGroupMessage({ message }),
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
    h.ul(
      [h.Class('space-y-0.5')],
      Array.map(pages, page =>
        navLink(
          page.href,
          isNavPageActive(route._tag, maybeExampleSlug, page._tag),
          page.label,
        ),
      ),
    )

  return h.ul(
    [h.Class('space-y-0.5')],
    [
      ...Array.zipWith(
        docsSections,
        sectionDisclosures,
        (section, disclosure) =>
          sidebarGroup({
            label: section.label,
            model: disclosure.model,
            toParentMessage: disclosure.toParentMessage,
            children: h.div(
              [h.Class('divide-y divide-gray-200 dark:divide-gray-800')],
              Array.map(section.pageGroups, group =>
                h.div(
                  [h.Class('py-2 first:pt-0 last:pb-0')],
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
        children: h.ul(
          [h.Class('space-y-0.5')],
          Array.map(apiModuleIndex, ({ slug, name }) =>
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
}

const lazyDesktopNavLinks = createLazy()
const lazyMobileNavLinks = createLazy()

export const sidebarView = (model: Model): Html => {
  const h = html<Message>()

  const desktopNavLinks = lazyDesktopNavLinks(computeNavLinks, [
    model.route,
    model.getStartedGroup,
    model.coreConceptsGroup,
    model.forReactDevelopersGroup,
    model.guidesGroup,
    model.testingGroup,
    model.bestPracticesGroup,
    model.patternsGroup,
    model.examplesGroup,
    model.foldkitUiGroup,
    model.aiGroup,
    model.apiReferenceGroup,
  ])
  const mobileNavLinks = lazyMobileNavLinks(computeNavLinks, [
    model.route,
    model.getStartedGroup,
    model.coreConceptsGroup,
    model.forReactDevelopersGroup,
    model.guidesGroup,
    model.testingGroup,
    model.bestPracticesGroup,
    model.patternsGroup,
    model.examplesGroup,
    model.foldkitUiGroup,
    model.aiGroup,
    model.apiReferenceGroup,
  ])

  const desktopSidebar = h.aside(
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
          h.OnMount(SyncSidebarScroll({ initialScroll: model.sidebarScroll })),
        ],
        [desktopNavLinks],
      ),
    ],
  )

  const mobileMenuContent = h.div(
    [h.Class('flex flex-col h-full')],
    [
      h.div(
        [
          h.Class(
            'flex justify-between items-center h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] px-3 border-b border-gray-300 dark:border-gray-800 shrink-0',
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
                h.Class('h-6 w-auto dark:invert'),
              ]),
              betaTag,
            ],
          ),
          h.button(
            [
              h.Class(
                'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              h.AriaLabel('Close menu'),
              h.OnClick(
                GotMobileMenuDialogMessage({
                  message: Ui.Dialog.Closed(),
                }),
              ),
            ],
            [Icon.close('w-6 h-6')],
          ),
        ],
      ),
      h.nav(
        [
          h.AriaLabel('Documentation'),
          h.Class('flex-1 overflow-y-auto'),
          h.Tabindex(-1),
          h.Autofocus(true),
        ],
        [mobileNavLinks],
      ),
      h.div(
        [h.Class('p-4 border-t border-gray-300 dark:border-gray-800 shrink-0')],
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

  const mobileMenu = Ui.Dialog.view({
    model: model.mobileMenuDialog,
    toParentMessage: message => GotMobileMenuDialogMessage({ message }),
    panelContent: mobileMenuContent,
    panelAttributes: [
      h.Class('fixed inset-0 z-[60] bg-cream dark:bg-gray-900 flex flex-col'),
    ],
    backdropAttributes: [h.Class('fixed inset-0 z-[59]')],
    attributes: [h.Class('md:hidden')],
  })

  return h.div([], [desktopSidebar, mobileMenu])
}
