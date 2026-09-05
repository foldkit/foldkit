import { clsx } from 'clsx'
import { Match, Option, String } from 'effect'
import { AsyncData } from 'foldkit'
import {
  Html,
  type HtmlBuilder,
  createLazy,
  inertHtml as ih,
} from 'foldkit/html'

import { type CodeBlock, Shared } from '../component'
import { pageNeighbors } from '../docsNav'
import { Icon } from '../icon'
import { Link } from '../link'
import { Message } from '../message'
import { type Model } from '../model'
import {
  About,
  AiMcp,
  AiOverview,
  AiSkills,
  ApiReference,
  AsyncData as AsyncDataPage,
  BestPractices,
  ComingFromReact,
  ComingFromTanStackQuery,
  Contact,
  ContentApi,
  Core,
  EffectAtomComparison,
  ElmComparison,
  Example,
  Examples,
  FieldValidation,
  GettingStarted,
  Manifesto,
  NotFound,
  Patterns,
  Performance,
  Privacy,
  ProjectOrganization,
  ReactComparison,
  Roadmap,
  Routing,
  Testing,
  TestingScene,
  TestingStory,
  ToolingLinting,
  TypingTerminal,
  Ui,
} from '../page'
import * as Prose from '../prose'
import { AppRoute, type DocsRoute, homeRouter } from '../route'
import * as SnippetCopy from '../snippetCopy'
import { type TableOfContentsEntry } from '../tableOfContentsEntry'
import {
  HeaderNav,
  Search,
  Sidebar,
  TableOfContents,
  ThemeSelector,
} from '../view'

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')
const LlmIgnore = ih.DataAttribute('llm-ignore', '')

// DOCS HEADER

export const headerView = (model: Model, h: HtmlBuilder<Message>) =>
  h.header(
    [
      h.Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 transform-gpu',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'docs-shell h-full px-4 md:px-6 flex items-center justify-between',
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
                  Shared.betaTag,
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('flex items-center gap-3 md:gap-8')],
            [
              HeaderNav.view(
                model.route,
                'hidden md:flex items-center gap-6',
                h,
              ),
              Search.triggerView('hidden md:flex', h),
              ThemeSelector.view(
                model.themeMenu,
                model.maybeThemePreference,
                h,
              ),
              h.div(
                [h.Class('hidden md:flex items-center gap-3 md:gap-4')],
                [
                  Shared.iconLink(
                    Link.github,
                    'GitHub',
                    Icon.github('w-5 h-5 md:w-6 md:h-6'),
                  ),
                  Shared.iconLink(
                    Link.discord,
                    'Discord',
                    Icon.discord('w-5 h-5 md:w-6 md:h-6'),
                  ),
                  Shared.iconLink(
                    Link.xSocial,
                    'X',
                    Icon.xSocial('w-5 h-5 md:w-6 md:h-6'),
                  ),
                  Shared.iconLink(
                    Link.npm,
                    'npm',
                    Icon.npm('w-6 h-6 md:w-8 md:h-8'),
                  ),
                ],
              ),
              Search.compactTriggerView('md:hidden', h),
              h.button(
                [
                  h.Class(
                    'md:hidden -mr-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
                  ),
                  h.AriaExpanded(model.mobileMenuDialog.isOpen),
                  h.AriaLabel('Toggle menu'),
                  h.OnClick(Message.ClickedOpenMobileMenu()),
                ],
                [Icon.menu('w-6 h-6')],
              ),
            ],
          ),
        ],
      ),
    ],
  )

// DOCS FOOTER

export const footerView = (
  currentYear: number,
  h: HtmlBuilder<Message>,
): Html =>
  h.footer(
    [
      h.Class(
        'px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:px-8 xl:px-12 mt-6 border-t border-gray-300 dark:border-gray-800',
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
      Shared.emailForm,
      h.hr([
        h.Class(
          'my-6 -mx-6 md:-mx-8 xl:-mx-12 border-t border-gray-300 dark:border-gray-800',
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
                  h.Class('link-accent'),
                ],
                ['Foldkit'],
              ),
              '.',
            ],
          ),
          h.p([h.Class('mt-1')], [`© ${currentYear} Devin Jameson`]),
          Shared.siteLinks,
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

export const searchWeight = (tag: string): string =>
  Match.value(tag).pipe(
    Match.when(String.startsWith('Core'), () => '10'),
    Match.whenOr('GettingStarted', 'Manifesto', () => '8'),
    Match.whenOr(
      String.startsWith('Patterns'),
      String.startsWith('BestPractices'),
      String.startsWith('Tooling'),
      () => '7',
    ),
    Match.whenOr(
      'RoutingAndNavigation',
      'FieldValidation',
      'ProjectOrganization',
      'ComingFromReact',
      'ComingFromTanStackQuery',
      'ReactComparison',
      'EffectAtomComparison',
      'ElmComparison',
      'Performance',
      'Roadmap',
      String.startsWith('Testing'),
      () => '6',
    ),
    Match.whenOr(String.startsWith('Ui'), String.startsWith('Ai'), () => '5'),
    Match.when('ApiModule', () => '3'),
    Match.whenOr('Examples', 'ExampleDetail', 'TypingTerminal', () => '2'),
    Match.orElse(() => '4'),
  )

// CONTENT WIDTH

const isWideContentRoute = AppRoute.isAnyOf(['Examples', 'ExampleDetail'])

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

const toApiReferenceMessage = (message: ApiReference.Message): Message =>
  Message.GotApiReferenceMessage({ message })

const toUiPageMessage = (message: Ui.Message): Message =>
  Message.GotUiPageMessage({ message })

const renderApiReference = (
  apiReference: ApiReference.Model,
  module: ApiReference.ApiModule,
  highlights: ApiReference.ApiData['highlights'],
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: `api-reference-${module.name}`,
    model: apiReference,
    view: ApiReference.view,
    viewInputs: {
      module,
      highlights,
      renderHeadingLink: Prose.renderHeadingLink(
        hash => Message.ClickedCopyLink({ hash }),
        h,
      ),
    },
    toParentMessage: toApiReferenceMessage,
  })

type DocPageView = (
  renderCopyButton: CodeBlock.RenderCopyButton,
  renderHeadingLink: Prose.RenderHeadingLink,
) => Html

type ProseDocPageView = (renderHeadingLink: Prose.RenderHeadingLink) => Html

const renderDocContent = (
  pageView: DocPageView,
  snippetCopy: SnippetCopy.Model,
  h: HtmlBuilder<Message>,
): Html =>
  pageView(
    SnippetCopy.renderer(
      snippetCopy,
      message => Message.GotSnippetCopyMessage({ message }),
      h,
    ),
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )

const renderProseContent = (
  pageView: ProseDocPageView,
  h: HtmlBuilder<Message>,
): Html =>
  pageView(
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )

const memoizedDocContent = createLazy()
const memoizedProseContent = createLazy()

const lazyDocsContent = (
  view: DocPageView,
  args: readonly [SnippetCopy.Model, HtmlBuilder<Message>],
): Html => memoizedDocContent(renderDocContent, [view, ...args])

const lazyProseContent = (
  view: ProseDocPageView,
  args: readonly [HtmlBuilder<Message>],
): Html => memoizedProseContent(renderProseContent, [view, ...args])

const lazyApiReference = createLazy()
const lazyApiReferenceSkeleton = createLazy()

// VIEW

export const view = (
  model: Model,
  docsRoute: DocsRoute,
  h: HtmlBuilder<Message>,
) => {
  const renderCopyButton = SnippetCopy.renderer(
    model.snippetCopy,
    message => Message.GotSnippetCopyMessage({ message }),
    h,
  )
  const renderHeadingLink = Prose.renderHeadingLink(
    hash => Message.ClickedCopyLink({ hash }),
    h,
  )

  const { content, tableOfContents: currentPageTableOfContents } = Match.value(
    docsRoute,
  ).pipe(
    Match.withReturnType<DocsPageView>(),
    Match.tagsExhaustive({
      Manifesto: () =>
        withTableOfContents(
          Manifesto.view(renderHeadingLink),
          Manifesto.tableOfContents,
        ),
      Roadmap: () =>
        withTableOfContents(
          Roadmap.view(renderHeadingLink),
          Roadmap.tableOfContents,
        ),
      Performance: () =>
        withTableOfContents(
          Performance.view(renderHeadingLink),
          Performance.tableOfContents,
        ),
      ComingFromReact: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'coming-from-react',
            model: model.comingFromReact,
            view: ComingFromReact.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: message =>
              Message.GotComingFromReactMessage({ message }),
          }),
          ComingFromReact.tableOfContents,
        ),
      ComingFromTanStackQuery: () =>
        withTableOfContents(
          lazyDocsContent(ComingFromTanStackQuery.view, [model.snippetCopy, h]),
          ComingFromTanStackQuery.tableOfContents,
        ),
      ReactComparison: () =>
        withTableOfContents(
          lazyDocsContent(ReactComparison.view, [model.snippetCopy, h]),
          ReactComparison.tableOfContents,
        ),
      EffectAtomComparison: () =>
        withTableOfContents(
          lazyDocsContent(EffectAtomComparison.view, [model.snippetCopy, h]),
          EffectAtomComparison.tableOfContents,
        ),
      ElmComparison: () =>
        withTableOfContents(
          lazyDocsContent(ElmComparison.view, [model.snippetCopy, h]),
          ElmComparison.tableOfContents,
        ),
      GettingStarted: () =>
        withTableOfContents(
          lazyDocsContent(GettingStarted.view, [model.snippetCopy, h]),
          GettingStarted.tableOfContents,
        ),
      RoutingAndNavigation: () =>
        withTableOfContents(
          lazyDocsContent(Routing.view, [model.snippetCopy, h]),
          Routing.tableOfContents,
        ),
      FieldValidation: () =>
        withTableOfContents(
          lazyDocsContent(FieldValidation.view, [model.snippetCopy, h]),
          FieldValidation.tableOfContents,
        ),
      Testing: () =>
        withTableOfContents(
          lazyDocsContent(Testing.view, [model.snippetCopy, h]),
          Testing.tableOfContents,
        ),
      TestingStory: () =>
        withTableOfContents(
          lazyDocsContent(TestingStory.view, [model.snippetCopy, h]),
          TestingStory.tableOfContents,
        ),
      TestingScene: () =>
        withTableOfContents(
          lazyDocsContent(TestingScene.view, [model.snippetCopy, h]),
          TestingScene.tableOfContents,
        ),
      Examples: () => withoutTableOfContents(Examples.view()),
      TypingTerminal: () =>
        withTableOfContents(
          TypingTerminal.view(renderHeadingLink),
          TypingTerminal.tableOfContents,
        ),
      ExampleDetail: ({ exampleSlug }) =>
        withoutTableOfContents(
          h.submodel({
            slotId: `example-detail-${exampleSlug}`,
            model: model.exampleDetail,
            view: Example.ExampleDetail.view,
            viewInputs: {
              slug: exampleSlug,
              isNarrowViewport: model.isNarrowViewport,
              isShowingChromeHint: Option.contains(
                model.maybeIsChromium,
                false,
              ),
              renderCopyButton,
            },
            toParentMessage: message =>
              Message.GotExampleDetailMessage({ message }),
          }),
        ),
      BestPracticesSideEffects: () =>
        withTableOfContents(
          lazyDocsContent(BestPractices.SideEffectsAndPurity.view, [
            model.snippetCopy,
            h,
          ]),
          BestPractices.SideEffectsAndPurity.tableOfContents,
        ),
      BestPracticesMessages: () =>
        withTableOfContents(
          BestPractices.Messages.view(renderHeadingLink),
          BestPractices.Messages.tableOfContents,
        ),
      BestPracticesKeying: () =>
        withTableOfContents(
          lazyDocsContent(BestPractices.Keying.view, [model.snippetCopy, h]),
          BestPractices.Keying.tableOfContents,
        ),
      BestPracticesImmutability: () =>
        withTableOfContents(
          lazyDocsContent(BestPractices.Immutability.view, [
            model.snippetCopy,
            h,
          ]),
          BestPractices.Immutability.tableOfContents,
        ),
      ProjectOrganization: () =>
        withTableOfContents(
          lazyDocsContent(ProjectOrganization.view, [model.snippetCopy, h]),
          ProjectOrganization.tableOfContents,
        ),
      ToolingLinting: () =>
        withTableOfContents(
          lazyDocsContent(ToolingLinting.view, [model.snippetCopy, h]),
          ToolingLinting.tableOfContents,
        ),
      ApiModule: ({ moduleSlug }) =>
        AsyncData.matchData(model.apiReference.apiData, {
          onData: data =>
            Option.match(
              ApiReference.resolveModule(data.parsedApi, moduleSlug),
              {
                onSome: module => ({
                  content: lazyApiReference(renderApiReference, [
                    model.apiReference,
                    module,
                    data.highlights,
                    h,
                  ]),
                  tableOfContents: Option.some(
                    ApiReference.toModuleTableOfContents(module),
                  ),
                }),
                onNone: () =>
                  withoutTableOfContents(
                    NotFound.view(moduleSlug, homeRouter()),
                  ),
              },
            ),
          onFailure: error =>
            withoutTableOfContents(ApiReference.failureView(error)),
          onEmpty: () =>
            withoutTableOfContents(
              lazyApiReferenceSkeleton(ApiReference.skeletonView, []),
            ),
        }),
      CoreArchitecture: () =>
        withTableOfContents(
          Core.Architecture.view(renderHeadingLink),
          Core.Architecture.tableOfContents,
        ),
      CoreCounterExample: () =>
        withTableOfContents(
          lazyDocsContent(Core.CounterExample.view, [model.snippetCopy, h]),
          Core.CounterExample.tableOfContents,
        ),
      CoreModel: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreModel.view, [model.snippetCopy, h]),
          Core.CoreModel.tableOfContents,
        ),
      CoreMessages: () =>
        withTableOfContents(
          lazyDocsContent(Core.Messages.view, [model.snippetCopy, h]),
          Core.Messages.tableOfContents,
        ),
      CoreUpdate: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreUpdate.view, [model.snippetCopy, h]),
          Core.CoreUpdate.tableOfContents,
        ),
      CoreView: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreView.view, [model.snippetCopy, h]),
          Core.CoreView.tableOfContents,
        ),
      CoreCommands: () =>
        withTableOfContents(
          lazyDocsContent(Core.Commands.view, [model.snippetCopy, h]),
          Core.Commands.tableOfContents,
        ),
      CoreMount: () =>
        withTableOfContents(
          lazyDocsContent(Core.Mount.view, [model.snippetCopy, h]),
          Core.Mount.tableOfContents,
        ),
      CoreCustomElement: () =>
        withTableOfContents(
          lazyDocsContent(Core.CustomElement.view, [model.snippetCopy, h]),
          Core.CustomElement.tableOfContents,
        ),
      CoreSubscriptions: () =>
        withTableOfContents(
          lazyDocsContent(Core.Subscriptions.view, [model.snippetCopy, h]),
          Core.Subscriptions.tableOfContents,
        ),
      CoreInitAndFlags: () =>
        withTableOfContents(
          lazyDocsContent(Core.InitAndFlags.view, [model.snippetCopy, h]),
          Core.InitAndFlags.tableOfContents,
        ),
      CoreDom: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreDom.view, [model.snippetCopy, h]),
          Core.CoreDom.tableOfContents,
        ),
      CoreRender: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreRender.view, [model.snippetCopy, h]),
          Core.CoreRender.tableOfContents,
        ),
      CoreFile: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreFile.view, [model.snippetCopy, h]),
          Core.CoreFile.tableOfContents,
        ),
      CoreHttp: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreHttp.view, [model.snippetCopy, h]),
          Core.CoreHttp.tableOfContents,
        ),
      CoreCanvas: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreCanvas.view, [model.snippetCopy, h]),
          Core.CoreCanvas.tableOfContents,
        ),
      CoreRuntime: () =>
        withTableOfContents(
          lazyDocsContent(Core.Runtime.view, [model.snippetCopy, h]),
          Core.Runtime.tableOfContents,
        ),
      CoreServerRendering: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreServerRendering.view, [
            model.snippetCopy,
            h,
          ]),
          Core.CoreServerRendering.tableOfContents,
        ),
      CoreResources: () =>
        withTableOfContents(
          lazyDocsContent(Core.Resources.view, [model.snippetCopy, h]),
          Core.Resources.tableOfContents,
        ),
      CoreManagedResources: () =>
        withTableOfContents(
          lazyDocsContent(Core.ManagedResources.view, [model.snippetCopy, h]),
          Core.ManagedResources.tableOfContents,
        ),
      CoreDevTools: () =>
        withTableOfContents(
          lazyDocsContent(Core.DevTools.view, [model.snippetCopy, h]),
          Core.DevTools.tableOfContents,
        ),
      CoreCrashView: () =>
        withTableOfContents(
          lazyDocsContent(Core.CrashView.view, [model.snippetCopy, h]),
          Core.CrashView.tableOfContents,
        ),
      CoreViewTransitions: () =>
        withTableOfContents(
          lazyDocsContent(Core.ViewTransitions.view, [model.snippetCopy, h]),
          Core.ViewTransitions.tableOfContents,
        ),
      CoreSlowWarnings: () =>
        withTableOfContents(
          lazyDocsContent(Core.Slow.view, [model.snippetCopy, h]),
          Core.Slow.tableOfContents,
        ),
      CoreFreezeModel: () =>
        withTableOfContents(
          lazyProseContent(Core.FreezeModel.view, [h]),
          Core.FreezeModel.tableOfContents,
        ),
      CorePreserveScroll: () =>
        withTableOfContents(
          lazyProseContent(Core.PreserveScroll.view, [h]),
          Core.PreserveScroll.tableOfContents,
        ),
      CoreSubmodel: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'core-submodel-page',
            model: model.coreSubmodelPage,
            view: Core.SubmodelPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: message =>
              Message.GotCoreSubmodelPageMessage({ message }),
          }),
          Core.SubmodelPage.tableOfContents,
        ),
      CoreMachine: () =>
        withTableOfContents(
          lazyDocsContent(Core.Machine.view, [model.snippetCopy, h]),
          Core.Machine.tableOfContents,
        ),
      AsyncData: () =>
        withTableOfContents(
          lazyDocsContent(AsyncDataPage.view, [model.snippetCopy, h]),
          AsyncDataPage.tableOfContents,
        ),
      PatternsInformingSubmodels: () =>
        withTableOfContents(
          lazyDocsContent(Patterns.InformingSubmodels.view, [
            model.snippetCopy,
            h,
          ]),
          Patterns.InformingSubmodels.tableOfContents,
        ),
      PatternsSubscriptionOrganization: () =>
        withTableOfContents(
          lazyDocsContent(Patterns.SubscriptionOrganization.view, [
            model.snippetCopy,
            h,
          ]),
          Patterns.SubscriptionOrganization.tableOfContents,
        ),
      CoreViewMemoization: () =>
        withTableOfContents(
          lazyDocsContent(Core.ViewMemoization.view, [model.snippetCopy, h]),
          Core.ViewMemoization.tableOfContents,
        ),
      CoreEmbedding: () =>
        withTableOfContents(
          lazyDocsContent(Core.Embedding.view, [model.snippetCopy, h]),
          Core.Embedding.tableOfContents,
        ),
      UiOverview: () =>
        withTableOfContents(
          lazyDocsContent(Ui.OverviewPage.view, [model.snippetCopy, h]),
          Ui.OverviewPage.tableOfContents,
        ),
      UiSelectionSubmodels: () =>
        withTableOfContents(
          lazyDocsContent(Ui.SelectionSubmodelsPage.view, [
            model.snippetCopy,
            h,
          ]),
          Ui.SelectionSubmodelsPage.tableOfContents,
        ),
      UiAnchor: () =>
        withTableOfContents(
          lazyDocsContent(Ui.AnchorPage.view, [model.snippetCopy, h]),
          Ui.AnchorPage.tableOfContents,
        ),
      UiHoverIntent: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-HoverIntent',
            model: model.uiPages,
            view: Ui.HoverIntentPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.HoverIntentPage.tableOfContents,
        ),
      UiButton: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Button',
            model: model.uiPages,
            view: Ui.ButtonPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.ButtonPage.tableOfContents,
        ),
      UiTabs: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Tabs',
            model: model.uiPages,
            view: Ui.TabsPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.TabsPage.tableOfContents,
        ),
      UiNav: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Nav',
            model: model.uiPages,
            view: Ui.NavPage.view,
            viewInputs: {
              renderCopyButton,
              renderHeadingLink,
              url: model.url,
            },
            toParentMessage: toUiPageMessage,
          }),
          Ui.NavPage.tableOfContents,
        ),
      UiDisclosure: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Disclosure',
            model: model.uiPages,
            view: Ui.DisclosurePage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.DisclosurePage.tableOfContents,
        ),
      UiDialog: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Dialog',
            model: model.uiPages,
            view: Ui.DialogPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.DialogPage.tableOfContents,
        ),
      UiMenu: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Menu',
            model: model.uiPages,
            view: Ui.MenuPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.MenuPage.tableOfContents,
        ),
      UiPopover: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Popover',
            model: model.uiPages,
            view: Ui.PopoverPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.PopoverPage.tableOfContents,
        ),
      UiTooltip: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Tooltip',
            model: model.uiPages,
            view: Ui.TooltipPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.TooltipPage.tableOfContents,
        ),
      UiToast: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Toast',
            model: model.uiPages,
            view: Ui.ToastPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.ToastPage.tableOfContents,
        ),
      UiListbox: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Listbox',
            model: model.uiPages,
            view: Ui.ListboxPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.ListboxPage.tableOfContents,
        ),
      UiRadioGroup: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-RadioGroup',
            model: model.uiPages,
            view: Ui.RadioGroupPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.RadioGroupPage.tableOfContents,
        ),
      UiSlider: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Slider',
            model: model.uiPages,
            view: Ui.SliderPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.SliderPage.tableOfContents,
        ),
      UiSwitch: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Switch',
            model: model.uiPages,
            view: Ui.SwitchPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.SwitchPage.tableOfContents,
        ),
      UiCalendar: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Calendar',
            model: model.uiPages,
            view: Ui.CalendarPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.CalendarPage.tableOfContents,
        ),
      UiDatePicker: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-DatePicker',
            model: model.uiPages,
            view: Ui.DatePickerPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.DatePickerPage.tableOfContents,
        ),
      UiCheckbox: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Checkbox',
            model: model.uiPages,
            view: Ui.CheckboxPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.CheckboxPage.tableOfContents,
        ),
      UiCombobox: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Combobox',
            model: model.uiPages,
            view: Ui.ComboboxPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.ComboboxPage.tableOfContents,
        ),
      UiInput: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Input',
            model: model.uiPages,
            view: Ui.InputPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.InputPage.tableOfContents,
        ),
      UiTextarea: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Textarea',
            model: model.uiPages,
            view: Ui.TextareaPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.TextareaPage.tableOfContents,
        ),
      UiFieldset: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Fieldset',
            model: model.uiPages,
            view: Ui.FieldsetPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.FieldsetPage.tableOfContents,
        ),
      UiSelect: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Select',
            model: model.uiPages,
            view: Ui.SelectPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.SelectPage.tableOfContents,
        ),
      UiDragAndDrop: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-DragAndDrop',
            model: model.uiPages,
            view: Ui.DragAndDropPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.DragAndDropPage.tableOfContents,
        ),
      UiFileDrop: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-FileDrop',
            model: model.uiPages,
            view: Ui.FileDropPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.FileDropPage.tableOfContents,
        ),
      UiAnimation: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-Animation',
            model: model.uiPages,
            view: Ui.AnimationPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.AnimationPage.tableOfContents,
        ),
      UiVirtualList: () =>
        withTableOfContents(
          h.submodel({
            slotId: 'ui-VirtualList',
            model: model.uiPages,
            view: Ui.VirtualListPage.view,
            viewInputs: { renderCopyButton, renderHeadingLink },
            toParentMessage: toUiPageMessage,
          }),
          Ui.VirtualListPage.tableOfContents,
        ),
      AiOverview: () =>
        withTableOfContents(
          lazyDocsContent(AiOverview.view, [model.snippetCopy, h]),
          AiOverview.tableOfContents,
        ),
      AiSkills: () =>
        withTableOfContents(
          lazyDocsContent(AiSkills.view, [model.snippetCopy, h]),
          AiSkills.tableOfContents,
        ),
      AiMcp: () =>
        withTableOfContents(
          lazyDocsContent(AiMcp.view, [model.snippetCopy, h]),
          AiMcp.tableOfContents,
        ),
      ContentApi: () =>
        withTableOfContents(
          lazyDocsContent(ContentApi.view, [model.snippetCopy, h]),
          ContentApi.tableOfContents,
        ),
      About: () =>
        withTableOfContents(
          About.view(renderHeadingLink),
          About.tableOfContents,
        ),
      Contact: () =>
        withTableOfContents(
          Contact.view(renderHeadingLink),
          Contact.tableOfContents,
        ),
      Privacy: () =>
        withTableOfContents(
          Privacy.view(renderHeadingLink),
          Privacy.tableOfContents,
        ),
      NotFound: ({ path }) =>
        withoutTableOfContents(NotFound.view(path, homeRouter())),
    }),
  )

  return h.div(
    [h.Class('flex flex-col min-h-screen')],
    [
      Shared.skipNavLink,
      headerView(model, h),
      Search.dialogView(model, h),
      h.div(
        [h.Class('docs-shell flex flex-1 pt-[var(--header-height)] md:pl-64')],
        [
          Sidebar.view(model, h),
          Sidebar.mobileView(model, h),
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
                  TableOfContents.mobileView(
                    tableOfContents,
                    model.activeSection,
                    model.isMobileTableOfContentsOpen,
                    h,
                  ),
                onNone: () => h.empty,
              }),
              h.keyed('div')(
                Match.value(docsRoute).pipe(
                  Match.tag(
                    'ApiModule',
                    ({ moduleSlug }) => `ApiModule-${moduleSlug}`,
                  ),
                  Match.orElse(({ _tag }) => _tag),
                ),
                [
                  PagefindBody,
                  h.DataAttribute(
                    'pagefind-weight',
                    searchWeight(docsRoute._tag),
                  ),
                  h.Class(
                    clsx('docs-content flex-1', {
                      'max-w-5xl': isWideContentRoute(docsRoute),
                    }),
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
              h.div([PagefindIgnore], [footerView(model.currentYear, h)]),
            ],
          ),
          Option.match(currentPageTableOfContents, {
            onSome: tableOfContents =>
              TableOfContents.view(tableOfContents, model.activeSection, h),
            onNone: () => h.empty,
          }),
        ],
      ),
    ],
  )
}
