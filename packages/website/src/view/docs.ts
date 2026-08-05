import { clsx } from 'clsx'
import { Match as M, Option, String as S } from 'effect'
import { AsyncData } from 'foldkit'
import type { Field } from 'foldkit/fieldValidation'
import {
  Html,
  type HtmlBuilder,
  createLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { pageNeighbors } from '../docsNav'
import { Icon } from '../icon'
import { Link } from '../link'
import {
  type EmailSubscriptionStatus,
  type Model,
  type TableOfContentsEntry,
} from '../main'
import {
  ClickedOpenMobileMenu,
  GotApiReferenceMessage,
  GotComingFromReactMessage,
  GotExampleDetailMessage,
  GotSearchMessage,
  GotUiPageMessage,
  type Message,
} from '../message'
import * as Page from '../page'
import { defaultRenderHeadingLink } from '../prose'
import { type DocsRoute, homeRouter } from '../route'
import * as Search from '../search'
import { defaultRenderCopyButton } from './codeBlock'
import { betaTag, emailFormView, iconLink, skipNavLink } from './shared'
import { sidebarView } from './sidebar'
import {
  mobileTableOfContentsView,
  tableOfContentsView,
} from './tableOfContents'
import { themeSelector } from './themeSelector'

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')
const LlmIgnore = ih.DataAttribute('llm-ignore', '')

const openSearchDialog: Message = GotSearchMessage({
  message: Search.ClickedOpenSearch(),
})

const searchKeyboardWarmupSelector = `#${Search.KEYBOARD_WARMUP_INPUT_ID}`

// DOCS HEADER

const docsHeaderView = (model: Model, h: HtmlBuilder<Message>) =>
  h.header(
    [
      h.Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 px-3 md:px-6 flex items-center justify-between transform-gpu',
      ),
    ],
    [
      h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.a(
            [h.Href(homeRouter()), h.Class('flex items-center gap-2')],
            [
              h.img([
                h.Src('/logo.svg'),
                h.Alt('Foldkit'),
                h.Width('801'),
                h.Height('200'),
                h.Class('h-6 md:h-8 w-auto dark:invert'),
              ]),
              betaTag,
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-3 md:gap-8')],
        [
          h.button(
            [
              h.Class(
                'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer',
              ),
              h.AriaLabel('Search documentation'),
              h.OnClickFocus(searchKeyboardWarmupSelector, openSearchDialog),
            ],
            [
              Icon.magnifyingGlass('w-4 h-4'),
              h.span([h.Class('mr-4')], ['Search...']),
              h.span(
                [
                  h.AriaHidden(true),
                  h.Class(
                    'text-xs text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-px font-mono',
                  ),
                ],
                ['⌘K'],
              ),
            ],
          ),
          themeSelector(model.themePreference, h),
          h.div(
            [h.Class('hidden md:flex items-center gap-3 md:gap-4')],
            [
              iconLink(
                Link.github,
                'GitHub',
                Icon.github('w-5 h-5 md:w-6 md:h-6'),
              ),
              iconLink(
                Link.discord,
                'Discord',
                Icon.discord('w-5 h-5 md:w-6 md:h-6'),
              ),
              iconLink(
                Link.xSocial,
                'X',
                Icon.xSocial('w-5 h-5 md:w-6 md:h-6'),
              ),
              iconLink(Link.npm, 'npm', Icon.npm('w-6 h-6 md:w-8 md:h-8')),
            ],
          ),
          h.button(
            [
              h.Class(
                'md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              h.AriaLabel('Search documentation'),
              h.OnClickFocus(searchKeyboardWarmupSelector, openSearchDialog),
            ],
            [Icon.magnifyingGlass('w-5 h-5')],
          ),
          h.button(
            [
              h.Class(
                'md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              h.AriaExpanded(model.mobileMenuDialog.isOpen),
              h.AriaLabel('Toggle menu'),
              h.OnClick(ClickedOpenMobileMenu()),
            ],
            [Icon.menu('w-6 h-6')],
          ),
        ],
      ),
    ],
  )

// DOCS FOOTER

const docsFooterView = (
  emailField: Field<string>,
  emailSubscriptionStatus: EmailSubscriptionStatus,
  currentYear: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.footer(
    [
      h.Class(
        'px-4 py-6 md:px-6 mt-6 border-t border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      h.p(
        [h.Class('text-base font-normal text-gray-900 dark:text-white mb-1')],
        ['Stay in the update loop.'],
      ),
      h.p(
        [h.Class('text-sm text-gray-600 dark:text-gray-300 mb-4')],
        ['New releases, patterns, and the occasional deep dive.'],
      ),
      M.value(emailSubscriptionStatus).pipe(
        M.withReturnType<Html>(),
        M.when('Succeeded', () =>
          h.p(
            [
              h.AriaLive('polite'),
              h.Class('text-accent-600 dark:text-accent-400 font-normal'),
            ],
            ['You’re in! Check your email for confirmation.'],
          ),
        ),
        M.orElse(status =>
          emailFormView(
            emailField,
            status,
            'flex flex-col sm:flex-row gap-3 max-w-md',
            h,
          ),
        ),
      ),
      h.hr([
        h.Class(
          'my-6 -mx-4 md:-mx-6 border-t border-gray-300 dark:border-gray-800',
        ),
      ]),
      h.div(
        [h.Class('text-sm text-gray-500 dark:text-gray-400')],
        [
          h.p(
            [],
            [
              'Built with ',
              h.a(
                [
                  h.Href(`${Link.websiteSource}/src/main.ts`),
                  h.Class(
                    'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
                  ),
                ],
                ['Foldkit'],
              ),
              '.',
            ],
          ),
          h.p([h.Class('mt-1')], [`© ${currentYear} Devin Jameson`]),
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
  h: HtmlBuilder<Message>,
) =>
  h.a(
    [
      h.Href(config.page.href),
      h.Class(
        clsx('group flex flex-col gap-1', {
          'items-start text-left': config.direction === 'Previous',
          'items-end text-right ml-auto': config.direction === 'Next',
        }),
      ),
    ],
    [
      h.span(
        [
          h.Class(
            'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
          ),
        ],
        [config.direction],
      ),
      h.span(
        [
          h.Class(
            'text-sm font-medium text-accent-600 dark:text-accent-400 group-hover:underline',
          ),
        ],
        config.direction === 'Previous'
          ? [
              h.span([h.Class('mr-1'), h.AriaHidden(true)], ['←']),
              config.page.label,
            ]
          : [
              config.page.label,
              h.span([h.Class('ml-1'), h.AriaHidden(true)], ['→']),
            ],
      ),
    ],
  )

const pageNavigationView = (tag: string, h: HtmlBuilder<Message>) => {
  const { maybePrevious, maybeNext } = pageNeighbors(tag)

  if (Option.isNone(maybePrevious) && Option.isNone(maybeNext)) {
    return h.empty
  }

  return h.nav(
    [
      h.AriaLabel('Page navigation'),
      h.Class(
        'flex items-stretch justify-between gap-4 mt-12 pt-6 border-t border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      Option.match(maybePrevious, {
        onNone: () => h.empty,
        onSome: page => neighborLink({ page, direction: 'Previous' }, h),
      }),
      Option.match(maybeNext, {
        onNone: () => h.empty,
        onSome: page => neighborLink({ page, direction: 'Next' }, h),
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
      S.startsWith('Tooling'),
      () => '7',
    ),
    M.whenOr(
      'RoutingAndNavigation',
      'FieldValidation',
      'ProjectOrganization',
      'ComingFromReact',
      'ComingFromTanStackQuery',
      'ReactComparison',
      'EffectAtomComparison',
      'ElmComparison',
      'WhyNoJsx',
      'WhatAboutSsr',
      'Performance',
      'Roadmap',
      S.startsWith('Testing'),
      () => '6',
    ),
    M.whenOr(S.startsWith('Ui'), S.startsWith('Ai'), () => '5'),
    M.when('ApiModule', () => '3'),
    M.whenOr('Examples', 'ExampleDetail', 'TypingTerminal', () => '2'),
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

const renderApiReference = (
  apiReference: Page.ApiReference.Model,
  module: Page.ApiReference.ApiModule,
  highlights: Page.ApiReference.ApiData['highlights'],
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: `api-reference-${module.name}`,
    model: apiReference,
    view: Page.ApiReference.view,
    viewInputs: {
      module,
      highlights,
      renderHeadingLink: defaultRenderHeadingLink(h),
    },
    toParentMessage: toApiReferenceMessage,
  })

const lazyDocsContent = createLazy()
const lazyApiReference = createLazy()
const lazyApiReferenceSkeleton = createLazy()

// VIEW

export const docsView = (
  model: Model,
  docsRoute: DocsRoute,
  h: HtmlBuilder<Message>,
) => {
  const renderCopyButton = defaultRenderCopyButton(model.copiedSnippets, h)
  const renderHeadingLink = defaultRenderHeadingLink(h)

  const { content, tableOfContents: currentPageTableOfContents } = M.value(
    docsRoute,
  ).pipe(
    M.withReturnType<DocsPageView>(),
    M.tagsExhaustive({
      Manifesto: () =>
        withTableOfContents(
          Page.Manifesto.view(h),
          Page.Manifesto.tableOfContents,
        ),
      WhyNoJsx: () =>
        withTableOfContents(
          lazyDocsContent(Page.WhyNoJsx.view, [model.copiedSnippets, h]),
          Page.WhyNoJsx.tableOfContents,
        ),
      WhatAboutSsr: () =>
        withTableOfContents(
          Page.WhatAboutSsr.view(h),
          Page.WhatAboutSsr.tableOfContents,
        ),
      Roadmap: () =>
        withTableOfContents(Page.Roadmap.view(h), Page.Roadmap.tableOfContents),
      Performance: () =>
        withTableOfContents(
          Page.Performance.view(h),
          Page.Performance.tableOfContents,
        ),
      ComingFromReact: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'coming-from-react',
            model: model.comingFromReact,
            view: Page.ComingFromReact.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: message => GotComingFromReactMessage({ message }),
          }),
          Page.ComingFromReact.tableOfContents,
        ),
      ComingFromTanStackQuery: () =>
        withTableOfContents(
          lazyDocsContent(Page.ComingFromTanStackQuery.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.ComingFromTanStackQuery.tableOfContents,
        ),
      ReactComparison: () =>
        withTableOfContents(
          lazyDocsContent(Page.ReactComparison.view, [model.copiedSnippets, h]),
          Page.ReactComparison.tableOfContents,
        ),
      EffectAtomComparison: () =>
        withTableOfContents(
          lazyDocsContent(Page.EffectAtomComparison.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.EffectAtomComparison.tableOfContents,
        ),
      ElmComparison: () =>
        withTableOfContents(
          lazyDocsContent(Page.ElmComparison.view, [model.copiedSnippets, h]),
          Page.ElmComparison.tableOfContents,
        ),
      GettingStarted: () =>
        withTableOfContents(
          lazyDocsContent(Page.GettingStarted.view, [model.copiedSnippets, h]),
          Page.GettingStarted.tableOfContents,
        ),
      RoutingAndNavigation: () =>
        withTableOfContents(
          lazyDocsContent(Page.Routing.view, [model.copiedSnippets, h]),
          Page.Routing.tableOfContents,
        ),
      FieldValidation: () =>
        withTableOfContents(
          lazyDocsContent(Page.FieldValidation.view, [model.copiedSnippets, h]),
          Page.FieldValidation.tableOfContents,
        ),
      Testing: () =>
        withTableOfContents(
          lazyDocsContent(Page.Testing.view, [model.copiedSnippets, h]),
          Page.Testing.tableOfContents,
        ),
      TestingStory: () =>
        withTableOfContents(
          lazyDocsContent(Page.TestingStory.view, [model.copiedSnippets, h]),
          Page.TestingStory.tableOfContents,
        ),
      TestingScene: () =>
        withTableOfContents(
          lazyDocsContent(Page.TestingScene.view, [model.copiedSnippets, h]),
          Page.TestingScene.tableOfContents,
        ),
      Examples: () => withoutTableOfContents(Page.Examples.view()),
      TypingTerminal: () =>
        withTableOfContents(
          Page.TypingTerminal.view(h),
          Page.TypingTerminal.tableOfContents,
        ),
      ExampleDetail: ({ exampleSlug }) =>
        withoutTableOfContents(
          h.submodel({
            slotId: `example-detail-${exampleSlug}`,
            model: model.exampleDetail,
            view: Page.Example.ExampleDetail.view,
            viewInputs: {
              slug: exampleSlug,
              isNarrowViewport: model.isNarrowViewport,
              isChromium: model.isChromium,
              renderCopyButton,
            },
            toParentMessage: message => GotExampleDetailMessage({ message }),
          }),
        ),
      BestPracticesSideEffects: () =>
        withTableOfContents(
          lazyDocsContent(Page.BestPractices.SideEffectsAndPurity.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.BestPractices.SideEffectsAndPurity.tableOfContents,
        ),
      BestPracticesMessages: () =>
        withTableOfContents(
          Page.BestPractices.Messages.view(h),
          Page.BestPractices.Messages.tableOfContents,
        ),
      BestPracticesKeying: () =>
        withTableOfContents(
          lazyDocsContent(Page.BestPractices.Keying.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.BestPractices.Keying.tableOfContents,
        ),
      BestPracticesImmutability: () =>
        withTableOfContents(
          lazyDocsContent(Page.BestPractices.Immutability.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.BestPractices.Immutability.tableOfContents,
        ),
      ProjectOrganization: () =>
        withTableOfContents(
          lazyDocsContent(Page.ProjectOrganization.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.ProjectOrganization.tableOfContents,
        ),
      ToolingLinting: () =>
        withTableOfContents(
          lazyDocsContent(Page.ToolingLinting.view, [model.copiedSnippets, h]),
          Page.ToolingLinting.tableOfContents,
        ),
      ApiModule: ({ moduleSlug }) =>
        AsyncData.matchData(model.apiReference.apiData, {
          onData: data =>
            Option.match(
              Page.ApiReference.resolveModule(data.parsedApi, moduleSlug),
              {
                onSome: module => ({
                  content: lazyApiReference(renderApiReference, [
                    model.apiReference,
                    module,
                    data.highlights,
                    h,
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
          onFailure: error =>
            withoutTableOfContents(Page.ApiReference.failureView(error)),
          onEmpty: () =>
            withoutTableOfContents(
              lazyApiReferenceSkeleton(Page.ApiReference.skeletonView, []),
            ),
        }),
      CoreArchitecture: () =>
        withTableOfContents(
          Page.Core.Architecture.view(h),
          Page.Core.Architecture.tableOfContents,
        ),
      CoreCounterExample: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CounterExample.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.CounterExample.tableOfContents,
        ),
      CoreModel: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreModel.view, [model.copiedSnippets, h]),
          Page.Core.CoreModel.tableOfContents,
        ),
      CoreMessages: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Messages.view, [model.copiedSnippets, h]),
          Page.Core.Messages.tableOfContents,
        ),
      CoreUpdate: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreUpdate.view, [model.copiedSnippets, h]),
          Page.Core.CoreUpdate.tableOfContents,
        ),
      CoreView: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreView.view, [model.copiedSnippets, h]),
          Page.Core.CoreView.tableOfContents,
        ),
      CoreCommands: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Commands.view, [model.copiedSnippets, h]),
          Page.Core.Commands.tableOfContents,
        ),
      CoreMount: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Mount.view, [model.copiedSnippets, h]),
          Page.Core.Mount.tableOfContents,
        ),
      CoreCustomElement: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CustomElement.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.CustomElement.tableOfContents,
        ),
      CoreSubscriptions: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Subscriptions.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.Subscriptions.tableOfContents,
        ),
      CoreInitAndFlags: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.InitAndFlags.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.InitAndFlags.tableOfContents,
        ),
      CoreDom: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreDom.view, [model.copiedSnippets, h]),
          Page.Core.CoreDom.tableOfContents,
        ),
      CoreRender: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreRender.view, [model.copiedSnippets, h]),
          Page.Core.CoreRender.tableOfContents,
        ),
      CoreFile: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreFile.view, [model.copiedSnippets, h]),
          Page.Core.CoreFile.tableOfContents,
        ),
      CoreHttp: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreHttp.view, [model.copiedSnippets, h]),
          Page.Core.CoreHttp.tableOfContents,
        ),
      CoreCanvas: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreCanvas.view, [model.copiedSnippets, h]),
          Page.Core.CoreCanvas.tableOfContents,
        ),
      CoreRuntime: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Runtime.view, [model.copiedSnippets, h]),
          Page.Core.Runtime.tableOfContents,
        ),
      CoreServerRendering: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CoreServerRendering.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.CoreServerRendering.tableOfContents,
        ),
      CoreResources: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Resources.view, [model.copiedSnippets, h]),
          Page.Core.Resources.tableOfContents,
        ),
      CoreManagedResources: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.ManagedResources.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.ManagedResources.tableOfContents,
        ),
      CoreDevTools: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.DevTools.view, [model.copiedSnippets, h]),
          Page.Core.DevTools.tableOfContents,
        ),
      CoreCrashView: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.CrashView.view, [model.copiedSnippets, h]),
          Page.Core.CrashView.tableOfContents,
        ),
      CoreViewTransitions: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.ViewTransitions.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.ViewTransitions.tableOfContents,
        ),
      CoreSlowWarnings: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Slow.view, [model.copiedSnippets, h]),
          Page.Core.Slow.tableOfContents,
        ),
      CoreFreezeModel: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.FreezeModel.view, [h]),
          Page.Core.FreezeModel.tableOfContents,
        ),
      CorePreserveScroll: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.PreserveScroll.view, [h]),
          Page.Core.PreserveScroll.tableOfContents,
        ),
      CoreSubmodel: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Submodel.view, [
            model.copiedSnippets,
            model.isMapMessagesUnderHoodOpen,
            h,
          ]),
          Page.Core.Submodel.tableOfContents,
        ),
      AsyncData: () =>
        withTableOfContents(
          lazyDocsContent(Page.AsyncData.view, [model.copiedSnippets, h]),
          Page.AsyncData.tableOfContents,
        ),
      PatternsInformingSubmodels: () =>
        withTableOfContents(
          lazyDocsContent(Page.Patterns.InformingSubmodels.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Patterns.InformingSubmodels.tableOfContents,
        ),
      PatternsSubscriptionOrganization: () =>
        withTableOfContents(
          lazyDocsContent(Page.Patterns.SubscriptionOrganization.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Patterns.SubscriptionOrganization.tableOfContents,
        ),
      CoreViewMemoization: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.ViewMemoization.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.Core.ViewMemoization.tableOfContents,
        ),
      CoreEmbedding: () =>
        withTableOfContents(
          lazyDocsContent(Page.Core.Embedding.view, [model.copiedSnippets, h]),
          Page.Core.Embedding.tableOfContents,
        ),
      UiOverview: () =>
        withTableOfContents(
          lazyDocsContent(Page.UiPages.OverviewPage.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.UiPages.OverviewPage.tableOfContents,
        ),
      UiSelectionSubmodels: () =>
        withTableOfContents(
          lazyDocsContent(Page.UiPages.SelectionSubmodelsPage.view, [
            model.copiedSnippets,
            h,
          ]),
          Page.UiPages.SelectionSubmodelsPage.tableOfContents,
        ),
      UiButton: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Button',
            model: model.uiPages,
            view: Page.UiPages.ButtonPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.ButtonPage.tableOfContents,
        ),
      UiTabs: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Tabs',
            model: model.uiPages,
            view: Page.UiPages.TabsPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.TabsPage.tableOfContents,
        ),
      UiNav: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Nav',
            model: model.uiPages,
            view: Page.UiPages.NavPage.view,
            viewInputs: {
              renderCopyButton,
              renderHeadingLink,
              url: model.url,
            },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.NavPage.tableOfContents,
        ),
      UiDisclosure: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Disclosure',
            model: model.uiPages,
            view: Page.UiPages.DisclosurePage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.DisclosurePage.tableOfContents,
        ),
      UiDialog: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Dialog',
            model: model.uiPages,
            view: Page.UiPages.DialogPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.DialogPage.tableOfContents,
        ),
      UiMenu: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Menu',
            model: model.uiPages,
            view: Page.UiPages.MenuPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.MenuPage.tableOfContents,
        ),
      UiPopover: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Popover',
            model: model.uiPages,
            view: Page.UiPages.PopoverPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.PopoverPage.tableOfContents,
        ),
      UiTooltip: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Tooltip',
            model: model.uiPages,
            view: Page.UiPages.TooltipPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.TooltipPage.tableOfContents,
        ),
      UiToast: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Toast',
            model: model.uiPages,
            view: Page.UiPages.ToastPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.ToastPage.tableOfContents,
        ),
      UiListbox: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Listbox',
            model: model.uiPages,
            view: Page.UiPages.ListboxPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.ListboxPage.tableOfContents,
        ),
      UiRadioGroup: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-RadioGroup',
            model: model.uiPages,
            view: Page.UiPages.RadioGroupPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.RadioGroupPage.tableOfContents,
        ),
      UiSlider: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Slider',
            model: model.uiPages,
            view: Page.UiPages.SliderPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.SliderPage.tableOfContents,
        ),
      UiSwitch: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Switch',
            model: model.uiPages,
            view: Page.UiPages.SwitchPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.SwitchPage.tableOfContents,
        ),
      UiCalendar: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Calendar',
            model: model.uiPages,
            view: Page.UiPages.CalendarPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.CalendarPage.tableOfContents,
        ),
      UiDatePicker: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-DatePicker',
            model: model.uiPages,
            view: Page.UiPages.DatePickerPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.DatePickerPage.tableOfContents,
        ),
      UiCheckbox: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Checkbox',
            model: model.uiPages,
            view: Page.UiPages.CheckboxPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.CheckboxPage.tableOfContents,
        ),
      UiCombobox: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Combobox',
            model: model.uiPages,
            view: Page.UiPages.ComboboxPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.ComboboxPage.tableOfContents,
        ),
      UiInput: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Input',
            model: model.uiPages,
            view: Page.UiPages.InputPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.InputPage.tableOfContents,
        ),
      UiTextarea: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Textarea',
            model: model.uiPages,
            view: Page.UiPages.TextareaPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.TextareaPage.tableOfContents,
        ),
      UiFieldset: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Fieldset',
            model: model.uiPages,
            view: Page.UiPages.FieldsetPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.FieldsetPage.tableOfContents,
        ),
      UiSelect: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Select',
            model: model.uiPages,
            view: Page.UiPages.SelectPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.SelectPage.tableOfContents,
        ),
      UiDragAndDrop: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-DragAndDrop',
            model: model.uiPages,
            view: Page.UiPages.DragAndDropPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.DragAndDropPage.tableOfContents,
        ),
      UiFileDrop: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-FileDrop',
            model: model.uiPages,
            view: Page.UiPages.FileDropPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.FileDropPage.tableOfContents,
        ),
      UiAnimation: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Animation',
            model: model.uiPages,
            view: Page.UiPages.AnimationPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.AnimationPage.tableOfContents,
        ),
      UiVirtualList: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-VirtualList',
            model: model.uiPages,
            view: Page.UiPages.VirtualListPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Page.UiPages.VirtualListPage.tableOfContents,
        ),
      AiOverview: () =>
        withTableOfContents(
          lazyDocsContent(Page.AiOverview.view, [model.copiedSnippets, h]),
          Page.AiOverview.tableOfContents,
        ),
      AiSkills: () =>
        withTableOfContents(
          lazyDocsContent(Page.AiSkills.view, [model.copiedSnippets, h]),
          Page.AiSkills.tableOfContents,
        ),
      AiMcp: () =>
        withTableOfContents(
          lazyDocsContent(Page.AiMcp.view, [model.copiedSnippets, h]),
          Page.AiMcp.tableOfContents,
        ),
      NotFound: ({ path }) =>
        withoutTableOfContents(Page.NotFound.view(path, homeRouter())),
    }),
  )

  return h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      docsHeaderView(model, h),
      h.submodel({
        slotId: 'search',
        model: model.search,
        view: Search.view,
        toParentMessage: message => GotSearchMessage({ message }),
      }),
      h.div(
        [h.Class('flex flex-1 pt-[var(--header-height)] md:pl-64')],
        [
          sidebarView(model, h),
          h.main(
            [
              h.Id('main-content'),
              h.Class(
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
                    h,
                  ),
                onNone: () => h.empty,
              }),
              h.keyed('div')(
                M.value(docsRoute).pipe(
                  M.tag(
                    'ApiModule',
                    ({ moduleSlug }) => `ApiModule-${moduleSlug}`,
                  ),
                  M.orElse(({ _tag }) => _tag),
                ),
                [
                  PagefindBody,
                  h.DataAttribute(
                    'pagefind-weight',
                    searchWeight(docsRoute._tag),
                  ),
                  h.Class(
                    'flex-1 w-full px-4 py-6 md:px-6 2xl:py-10 max-w-4xl mx-auto min-w-0',
                  ),
                ],
                [
                  content,
                  h.div(
                    [PagefindIgnore, LlmIgnore],
                    [pageNavigationView(docsRoute._tag, h)],
                  ),
                ],
              ),
              h.div(
                [PagefindIgnore],
                [
                  docsFooterView(
                    model.emailField,
                    model.emailSubscriptionStatus,
                    model.currentYear,
                    h,
                  ),
                ],
              ),
            ],
          ),
          Option.match(currentPageTableOfContents, {
            onSome: tableOfContents =>
              tableOfContentsView(tableOfContents, model.activeSection, h),
            onNone: () => h.empty,
          }),
        ],
      ),
    ],
  )
}
