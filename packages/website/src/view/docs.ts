import { clsx } from 'clsx'
import { Match as M, Option, String as S } from 'effect'
import { Ui } from 'foldkit'
import { Html, createLazy } from 'foldkit/html'

import { pageNeighbors } from '../docsNav'
import {
  Alt,
  AriaExpanded,
  AriaHidden,
  AriaLabel,
  AriaLive,
  Class,
  DataAttribute,
  Height,
  Href,
  Id,
  OnClick,
  PagefindBody,
  PagefindIgnore,
  Src,
  Width,
  a,
  button,
  div,
  empty,
  footer,
  header,
  hr,
  img,
  keyed,
  main,
  nav,
  p,
  span,
} from '../html'
import { Icon } from '../icon'
import { Link } from '../link'
import {
  type EmailSubscriptionStatus,
  type Model,
  type StringField,
  type TableOfContentsEntry,
} from '../main'
import {
  GotApiReferenceMessage,
  GotComingFromReactMessage,
  GotExampleDetailMessage,
  GotMobileMenuDialogMessage,
  GotSearchMessage,
  GotUiPageMessage,
  type Message,
} from '../message'
import * as Page from '../page'
import { type DocsRoute, homeRouter } from '../route'
import * as Search from '../search'
import { betaTag, emailFormView, iconLink, skipNavLink } from './shared'
import { sidebarView } from './sidebar'
import {
  mobileTableOfContentsView,
  tableOfContentsView,
} from './tableOfContents'
import { themeSelector } from './themeSelector'

// DOCS HEADER

const docsHeaderView = (model: Model) =>
  header(
    [
      Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 px-3 md:px-6 flex items-center justify-between transform-gpu',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          a(
            [Href(homeRouter()), Class('flex items-center gap-2')],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Width('801'),
                Height('200'),
                Class('h-6 md:h-8 w-auto dark:invert'),
              ]),
              betaTag,
            ],
          ),
        ],
      ),
      div(
        [Class('flex items-center gap-3 md:gap-8')],
        [
          button(
            [
              Class(
                'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer',
              ),
              AriaLabel('Search documentation'),
              OnClick(
                GotSearchMessage({
                  message: Search.GotSearchDialogMessage({
                    message: Ui.Dialog.Opened(),
                  }),
                }),
              ),
            ],
            [
              Icon.magnifyingGlass('w-4 h-4'),
              span([Class('mr-4')], ['Search...']),
              span(
                [
                  AriaHidden(true),
                  Class(
                    'text-xs text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-px font-mono',
                  ),
                ],
                ['\u2318K'],
              ),
            ],
          ),
          themeSelector(model.themePreference),
          div(
            [Class('hidden md:flex items-center gap-3 md:gap-4')],
            [
              iconLink(
                Link.github,
                'GitHub',
                Icon.github('w-5 h-5 md:w-6 md:h-6'),
              ),
              iconLink(Link.npm, 'npm', Icon.npm('w-6 h-6 md:w-8 md:h-8')),
            ],
          ),
          button(
            [
              Class(
                'md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              AriaLabel('Search documentation'),
              OnClick(
                GotSearchMessage({
                  message: Search.GotSearchDialogMessage({
                    message: Ui.Dialog.Opened(),
                  }),
                }),
              ),
            ],
            [Icon.magnifyingGlass('w-5 h-5')],
          ),
          button(
            [
              Class(
                'md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              AriaExpanded(model.mobileMenuDialog.isOpen),
              AriaLabel('Toggle menu'),
              OnClick(
                GotMobileMenuDialogMessage({
                  message: Ui.Dialog.Opened(),
                }),
              ),
            ],
            [Icon.menu('w-6 h-6')],
          ),
        ],
      ),
    ],
  )

// DOCS FOOTER

const docsFooterView = (
  emailField: StringField,
  emailSubscriptionStatus: EmailSubscriptionStatus,
  currentYear: number,
): Html =>
  footer(
    [
      Class(
        'px-4 py-6 md:px-6 mt-6 border-t border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      p(
        [Class('text-base font-normal text-gray-900 dark:text-white mb-1')],
        ['Stay in the update loop.'],
      ),
      p(
        [Class('text-sm text-gray-600 dark:text-gray-300 mb-4')],
        ['New releases, patterns, and the occasional deep dive.'],
      ),
      M.value(emailSubscriptionStatus).pipe(
        M.withReturnType<Html>(),
        M.when('Succeeded', () =>
          p(
            [
              AriaLive('polite'),
              Class('text-accent-600 dark:text-accent-400 font-normal'),
            ],
            ['You\u2019re in! Check your email for confirmation.'],
          ),
        ),
        M.orElse(status =>
          emailFormView(
            emailField,
            status,
            'flex flex-col sm:flex-row gap-3 max-w-md',
          ),
        ),
      ),
      hr([
        Class(
          'my-6 -mx-4 md:-mx-6 border-t border-gray-300 dark:border-gray-800',
        ),
      ]),
      div(
        [Class('text-sm text-gray-500 dark:text-gray-400')],
        [
          p(
            [],
            [
              'Built with ',
              a(
                [
                  Href(`${Link.websiteSource}/src/main.ts`),
                  Class(
                    'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
                  ),
                ],
                ['Foldkit'],
              ),
              '.',
            ],
          ),
          p([Class('mt-1')], [`\u00A9 ${currentYear} Devin Jameson`]),
        ],
      ),
    ],
  )

// PAGE NAVIGATION

type NavPage = Readonly<{ href: string; label: string }>

const neighborLink = (
  config: Readonly<{
    page: NavPage
    direction: 'Previous' | 'Next'
  }>,
) =>
  a(
    [
      Href(config.page.href),
      Class(
        clsx('group flex flex-col gap-1', {
          'items-start text-left': config.direction === 'Previous',
          'items-end text-right ml-auto': config.direction === 'Next',
        }),
      ),
    ],
    [
      span(
        [
          Class(
            'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
          ),
        ],
        [config.direction],
      ),
      span(
        [
          Class(
            'text-sm font-medium text-accent-600 dark:text-accent-400 group-hover:underline',
          ),
        ],
        config.direction === 'Previous'
          ? [
              span([Class('mr-1'), AriaHidden(true)], ['\u2190']),
              config.page.label,
            ]
          : [
              config.page.label,
              span([Class('ml-1'), AriaHidden(true)], ['\u2192']),
            ],
      ),
    ],
  )

const pageNavigationView = (tag: string) => {
  const { maybePrevious, maybeNext } = pageNeighbors(tag)

  if (Option.isNone(maybePrevious) && Option.isNone(maybeNext)) {
    return empty
  }

  return nav(
    [
      AriaLabel('Page navigation'),
      Class(
        'flex items-stretch justify-between gap-4 mt-12 pt-6 border-t border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      Option.match(maybePrevious, {
        onNone: () => empty,
        onSome: page => neighborLink({ page, direction: 'Previous' }),
      }),
      Option.match(maybeNext, {
        onNone: () => empty,
        onSome: page => neighborLink({ page, direction: 'Next' }),
      }),
    ],
  )
}

// SEARCH WEIGHT

const searchWeight = (tag: string): string =>
  M.value(tag).pipe(
    M.when(S.startsWith('Core'), () => '10'),
    M.whenOr('GettingStarted', 'Manifesto', () => '8'),
    M.whenOr(
      S.startsWith('Patterns'),
      S.startsWith('BestPractices'),
      () => '7',
    ),
    M.whenOr(
      'RoutingAndNavigation',
      'FieldValidation',
      'ProjectOrganization',
      'ComingFromReact',
      'ReactComparison',
      S.startsWith('Testing'),
      () => '6',
    ),
    M.whenOr(S.startsWith('Ui'), S.startsWith('Ai'), () => '5'),
    M.when('ApiModule', () => '3'),
    M.whenOr('Examples', 'ExampleDetail', () => '2'),
    M.orElse(() => '4'),
  )

// CONTENT ROUTING

type DocsPageView = Readonly<{
  content: Html
  tableOfContents: Option.Option<ReadonlyArray<TableOfContentsEntry>>
}>

const withTableOfContents = (
  content: Html,
  tableOfContents: ReadonlyArray<TableOfContentsEntry>,
): DocsPageView => ({
  content,
  tableOfContents: Option.some(tableOfContents),
})

const withoutTableOfContents = (content: Html): DocsPageView => ({
  content,
  tableOfContents: Option.none(),
})

const toApiReferenceMessage = (message: Page.ApiReference.Message): Message =>
  GotApiReferenceMessage({ message })

const toUiPageMessage = (message: Page.UiPages.Message): Message =>
  GotUiPageMessage({ message })

const apiReferenceView = (
  module: Page.ApiReference.ApiModule,
  disclosures: Page.ApiReference.Disclosures,
  highlights: Page.ApiReference.ApiData['highlights'],
): Html =>
  Page.ApiReference.view(module, disclosures, highlights, toApiReferenceMessage)

const lazyDocsContent = createLazy()
const lazyApiReference = createLazy()
const lazyApiReferenceSkeleton = createLazy()

// VIEW

export const docsView = (model: Model, docsRoute: DocsRoute) => {
  const { content, tableOfContents: currentPageTableOfContents } = M.value(
    docsRoute,
  ).pipe(
    M.withReturnType<DocsPageView>(),
    M.tagsExhaustive({
      Manifesto: () =>
        withTableOfContents(
          Page.Manifesto.view(),
          Page.Manifesto.tableOfContents,
        ),
      ComingFromReact: () =>
        withTableOfContents(
          Page.ComingFromReact.view(
            model.copiedSnippets,
            model.comingFromReact,
            message => GotComingFromReactMessage({ message }),
          ),
          Page.ComingFromReact.tableOfContents,
        ),
      ReactComparison: () =>
        withTableOfContents(
          lazyDocsContent(Page.ReactComparison.view, [model.copiedSnippets]),
          Page.ReactComparison.tableOfContents,
        ),
      GettingStarted: () =>
        withTableOfContents(
          lazyDocsContent(Page.GettingStarted.view, [model.copiedSnippets]),
          Page.GettingStarted.tableOfContents,
        ),
      RoutingAndNavigation: () =>
        withTableOfContents(
          lazyDocsContent(Page.Routing.view, [model.copiedSnippets]),
          Page.Routing.tableOfContents,
        ),
      FieldValidation: () =>
        withTableOfContents(
          lazyDocsContent(Page.FieldValidation.view, [model.copiedSnippets]),
          Page.FieldValidation.tableOfContents,
        ),
      Testing: () =>
        withTableOfContents(
          lazyDocsContent(Page.Testing.view, [model.copiedSnippets]),
          Page.Testing.tableOfContents,
        ),
      TestingStory: () =>
        withTableOfContents(
          lazyDocsContent(Page.TestingStory.view, [model.copiedSnippets]),
          Page.TestingStory.tableOfContents,
        ),
      TestingScene: () =>
        withTableOfContents(
          lazyDocsContent(Page.TestingScene.view, [model.copiedSnippets]),
          Page.TestingScene.tableOfContents,
        ),
      Examples: () => withoutTableOfContents(Page.Examples.view()),
      ExampleDetail: ({ exampleSlug }) =>
        withoutTableOfContents(
          Page.Example.ExampleDetail.view(
            model.exampleDetail,
            exampleSlug,
            model.copiedSnippets,
            model.isNarrowViewport,
            message => GotExampleDetailMessage({ message }),
          ),
        ),
      BestPracticesSideEffects: () =>
        withTableOfContents(
          lazyDocsContent(Page.BestPractices.SideEffectsAndPurity.view, [
            model.copiedSnippets,
          ]),
          Page.BestPractices.SideEffectsAndPurity.tableOfContents,
        ),
      BestPracticesMessages: () =>
        withTableOfContents(
          Page.BestPractices.Messages.view(),
          Page.BestPractices.Messages.tableOfContents,
        ),
      BestPracticesKeying: () =>
        withTableOfContents(
          lazyDocsContent(Page.BestPractices.Keying.view, [
            model.copiedSnippets,
          ]),
          Page.BestPractices.Keying.tableOfContents,
        ),
      BestPracticesImmutability: () =>
        withTableOfContents(
          lazyDocsContent(Page.BestPractices.Immutability.view, [
            model.copiedSnippets,
          ]),
          Page.BestPractices.Immutability.tableOfContents,
        ),
      ProjectOrganization: () =>
        withTableOfContents(
          lazyDocsContent(Page.ProjectOrganization.view, [
            model.copiedSnippets,
          ]),
          Page.ProjectOrganization.tableOfContents,
        ),
      ApiModule: ({ moduleSlug }) =>
        M.value(model.apiReference.apiData).pipe(
          M.withReturnType<{
            content: Html
            tableOfContents: Option.Option<ReadonlyArray<TableOfContentsEntry>>
          }>(),
          M.tag('Ok', ({ data }) =>
            Option.match(
              Page.ApiReference.resolveModule(data.parsedApi, moduleSlug),
              {
                onSome: module => ({
                  content: lazyApiReference(apiReferenceView, [
                    module,
                    model.apiReference.disclosures,
                    data.highlights,
                  ]),
                  tableOfContents: Option.some(
                    Page.ApiReference.toModuleTableOfContents(module),
                  ),
                }),
                onNone: () =>
                  withoutTableOfContents(
                    Page.NotFound.view(moduleSlug, homeRouter()),
                  ),
              },
            ),
          ),
          M.tag('Failure', ({ error }) =>
            withoutTableOfContents(Page.ApiReference.failureView(error)),
          ),
          M.orElse(() =>
            withoutTableOfContents(
              lazyApiReferenceSkeleton(Page.ApiReference.skeletonView, []),
            ),
          ),
        ),
      CoreArchitecture: () =>
        withTableOfContents(
          Page.Core.Architecture.view(),
          Page.Core.Architecture.tableOfContents,
        ),
      CoreCounterExample: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CounterExample.view, [
            model.copiedSnippets,
          ]),
          Page.Core.CounterExample.tableOfContents,
        ),
      CoreModel: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreModel.view, [model.copiedSnippets]),
          Page.Core.CoreModel.tableOfContents,
        ),
      CoreMessages: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Messages.view, [model.copiedSnippets]),
          Page.Core.Messages.tableOfContents,
        ),
      CoreUpdate: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreUpdate.view, [model.copiedSnippets]),
          Page.Core.CoreUpdate.tableOfContents,
        ),
      CoreView: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreView.view, [model.copiedSnippets]),
          Page.Core.CoreView.tableOfContents,
        ),
      CoreCommands: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Commands.view, [model.copiedSnippets]),
          Page.Core.Commands.tableOfContents,
        ),
      CoreSubscriptions: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Subscriptions.view, [model.copiedSnippets]),
          Page.Core.Subscriptions.tableOfContents,
        ),
      CoreInitAndFlags: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.InitAndFlags.view, [model.copiedSnippets]),
          Page.Core.InitAndFlags.tableOfContents,
        ),
      CoreTask: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreTask.view, [model.copiedSnippets]),
          Page.Core.CoreTask.tableOfContents,
        ),
      CoreFile: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreFile.view, [model.copiedSnippets]),
          Page.Core.CoreFile.tableOfContents,
        ),
      CoreRunningYourApp: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.RunningYourApp.view, [
            model.copiedSnippets,
          ]),
          Page.Core.RunningYourApp.tableOfContents,
        ),
      CoreResources: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Resources.view, [model.copiedSnippets]),
          Page.Core.Resources.tableOfContents,
        ),
      CoreManagedResources: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.ManagedResources.view, [
            model.copiedSnippets,
          ]),
          Page.Core.ManagedResources.tableOfContents,
        ),
      CoreDevtools: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.DevTools.view, [model.copiedSnippets]),
          Page.Core.DevTools.tableOfContents,
        ),
      CoreCrashView: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CrashView.view, [model.copiedSnippets]),
          Page.Core.CrashView.tableOfContents,
        ),
      CoreSlowView: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.SlowView.view, [model.copiedSnippets]),
          Page.Core.SlowView.tableOfContents,
        ),
      PatternsSubmodels: () =>
        withTableOfContents(
          lazyDocsContent(Page.Patterns.Submodels.view, [model.copiedSnippets]),
          Page.Patterns.Submodels.tableOfContents,
        ),
      PatternsOutMessage: () =>
        withTableOfContents(
          lazyDocsContent(Page.Patterns.OutMessage.view, [
            model.copiedSnippets,
          ]),
          Page.Patterns.OutMessage.tableOfContents,
        ),
      CoreViewMemoization: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.ViewMemoization.view, [
            model.copiedSnippets,
          ]),
          Page.Core.ViewMemoization.tableOfContents,
        ),
      UiOverview: () =>
        withTableOfContents(
          Page.UiPages.OverviewPage.view(),
          Page.UiPages.OverviewPage.tableOfContents,
        ),
      UiButton: () =>
        withTableOfContents(
          Page.UiPages.ButtonPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.ButtonPage.tableOfContents,
        ),
      UiTabs: () =>
        withTableOfContents(
          Page.UiPages.TabsPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.TabsPage.tableOfContents,
        ),
      UiDisclosure: () =>
        withTableOfContents(
          Page.UiPages.DisclosurePage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.DisclosurePage.tableOfContents,
        ),
      UiDialog: () =>
        withTableOfContents(
          Page.UiPages.DialogPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.DialogPage.tableOfContents,
        ),
      UiMenu: () =>
        withTableOfContents(
          Page.UiPages.MenuPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.MenuPage.tableOfContents,
        ),
      UiPopover: () =>
        withTableOfContents(
          Page.UiPages.PopoverPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.PopoverPage.tableOfContents,
        ),
      UiListbox: () =>
        withTableOfContents(
          Page.UiPages.ListboxPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.ListboxPage.tableOfContents,
        ),
      UiRadioGroup: () =>
        withTableOfContents(
          Page.UiPages.RadioGroupPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.RadioGroupPage.tableOfContents,
        ),
      UiSwitch: () =>
        withTableOfContents(
          Page.UiPages.SwitchPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.SwitchPage.tableOfContents,
        ),
      UiCheckbox: () =>
        withTableOfContents(
          Page.UiPages.CheckboxPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.CheckboxPage.tableOfContents,
        ),
      UiCombobox: () =>
        withTableOfContents(
          Page.UiPages.ComboboxPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.ComboboxPage.tableOfContents,
        ),
      UiInput: () =>
        withTableOfContents(
          Page.UiPages.InputPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.InputPage.tableOfContents,
        ),
      UiTextarea: () =>
        withTableOfContents(
          Page.UiPages.TextareaPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.TextareaPage.tableOfContents,
        ),
      UiFieldset: () =>
        withTableOfContents(
          Page.UiPages.FieldsetPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.FieldsetPage.tableOfContents,
        ),
      UiSelect: () =>
        withTableOfContents(
          Page.UiPages.SelectPage.view(
            model.uiPages,
            toUiPageMessage,
            model.copiedSnippets,
          ),
          Page.UiPages.SelectPage.tableOfContents,
        ),
      UiDragAndDrop: () =>
        withTableOfContents(
          Page.UiPages.DragAndDropPage.view(model.uiPages, toUiPageMessage),
          Page.UiPages.DragAndDropPage.tableOfContents,
        ),
      UiTransition: () =>
        withTableOfContents(
          Page.UiPages.TransitionPage.view(model.uiPages, toUiPageMessage),
          Page.UiPages.TransitionPage.tableOfContents,
        ),
      AiOverview: () =>
        withTableOfContents(
          lazyDocsContent(Page.AiOverview.view, [model.copiedSnippets]),
          Page.AiOverview.tableOfContents,
        ),
      AiSkills: () =>
        withTableOfContents(
          lazyDocsContent(Page.AiSkills.view, [model.copiedSnippets]),
          Page.AiSkills.tableOfContents,
        ),
      NotFound: ({ path }) =>
        withoutTableOfContents(Page.NotFound.view(path, homeRouter())),
    }),
  )

  const toParentMessage = (message: Search.Message): Message =>
    GotSearchMessage({ message })

  return keyed('div')(
    'docs',
    [Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      docsHeaderView(model),
      Search.view(model.search, toParentMessage),
      div(
        [Class('flex flex-1 pt-[var(--header-height)] md:pl-64')],
        [
          sidebarView(model),
          main(
            [
              Id('main-content'),
              Class(
                clsx('flex-1 min-w-0 flex flex-col bg-cream dark:bg-gray-900', {
                  'pt-[var(--mobile-toc-height)]': Option.isSome(
                    currentPageTableOfContents,
                  ),
                }),
              ),
            ],
            [
              Option.match(currentPageTableOfContents, {
                onSome: tableOfContents =>
                  mobileTableOfContentsView(
                    tableOfContents,
                    model.activeSection,
                    model.isMobileTableOfContentsOpen,
                  ),
                onNone: () => empty,
              }),
              keyed('div')(
                M.value(docsRoute).pipe(
                  M.tag(
                    'ApiModule',
                    ({ moduleSlug }) => `ApiModule-${moduleSlug}`,
                  ),
                  M.orElse(({ _tag }) => _tag),
                ),
                [
                  PagefindBody,
                  DataAttribute(
                    'pagefind-weight',
                    searchWeight(docsRoute._tag),
                  ),
                  Class(
                    'flex-1 w-full px-4 py-6 md:px-6 2xl:py-10 max-w-4xl mx-auto min-w-0',
                  ),
                ],
                [
                  content,
                  div([PagefindIgnore], [pageNavigationView(docsRoute._tag)]),
                ],
              ),
              div(
                [PagefindIgnore],
                [
                  docsFooterView(
                    model.emailField,
                    model.emailSubscriptionStatus,
                    model.currentYear,
                  ),
                ],
              ),
            ],
          ),
          Option.match(currentPageTableOfContents, {
            onSome: tableOfContents =>
              tableOfContentsView(tableOfContents, model.activeSection),
            onNone: () => empty,
          }),
        ],
      ),
    ],
  )
}
