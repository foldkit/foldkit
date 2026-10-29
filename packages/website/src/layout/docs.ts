import { clsx } from 'clsx'
import { Match, Option, String } from 'effect'
import { Html, createLazy, inertHtml as ih } from 'foldkit/html'

import { type CodeBlock, Shared } from '../component'
import type { ApplicationViewBuilder } from '../composition'
import {
  ApiReferenceBinding,
  ComingFromReactBinding,
  CoreBlockPageBinding,
  ExampleDetailBinding,
  SnippetCopyBinding,
  SnippetDisclosureBinding,
  UiPagesBinding,
} from '../composition'
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
  ApiReferenceBlock,
  AsyncData as AsyncDataPage,
  BestPractices,
  ComingFromTanStackQuery,
  Contact,
  ContentApi,
  Core,
  EffectAtomComparison,
  ElmComparison,
  Examples,
  FieldValidation,
  GetStarted,
  NotFound,
  Patterns,
  Performance,
  PreviewMigration,
  PreviewUpgrade,
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
  WhyFoldkit,
} from '../page'
import * as ApiReference from '../page/apiReference/domain'
import * as ComingFromReact from '../page/comingFromReact/domain'
import * as CoreBlockMetadata from '../page/core/blockPage/domain'
import * as UiDocumentation from '../page/ui/domain'
import * as Prose from '../prose'
import { ApplicationRoute, type DocsRoute, homeRouter } from '../route'
import { SnippetCopyBlock } from '../snippetCopy'
import * as SnippetCopyRenderer from '../snippetCopyRenderer'
import { SnippetDisclosureBlock } from '../snippetDisclosure'
import * as SnippetDisclosureRenderer from '../snippetDisclosureRenderer'
import { type TableOfContentsEntry } from '../tableOfContentsEntry'
import {
  HeaderNav,
  Search,
  Sidebar,
  TableOfContents,
  ThemeSelector,
} from '../view'

type ApiReferenceBlockModel = typeof ApiReferenceBlock.Model.Type
type SnippetCopyBlockModel = typeof SnippetCopyBlock.Model.Type
type SnippetDisclosureBlockModel = typeof SnippetDisclosureBlock.Model.Type

const PagefindBody = ih.DataAttribute('pagefind-body', '')
const PagefindIgnore = ih.DataAttribute('pagefind-ignore', '')
const LlmIgnore = ih.DataAttribute('llm-ignore', '')

// DOCS HEADER

export const headerView = (model: Model, h: ApplicationViewBuilder) =>
  h.header(
    [
      h.Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transform-gpu',
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
            [h.Class('flex items-center gap-12')],
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
              HeaderNav.view(
                model.route,
                'hidden md:flex items-center gap-6',
                h,
              ),
            ],
          ),
          h.div(
            [h.Class('flex items-center gap-1')],
            [
              Search.triggerView('hidden md:flex', h),
              Shared.headerGroupDivider('hidden md:block mx-3'),
              h.div(
                [h.Class('hidden md:flex items-center gap-3')],
                [
                  Shared.iconLink(
                    Link.github,
                    'GitHub',
                    Icon.github('w-5 h-5'),
                  ),
                  Shared.iconLink(
                    Link.discord,
                    'Discord',
                    Icon.discord('w-5 h-5'),
                  ),
                  Shared.iconLink(Link.xSocial, 'X', Icon.xSocial('w-5 h-5')),
                  Shared.iconLink(Link.npm, 'npm', Icon.npm('w-6 h-6')),
                ],
              ),
              Shared.headerGroupDivider('hidden md:block mx-3'),
              Search.compactTriggerView('inline-flex md:hidden', h),
              ThemeSelector.view(
                model.themeMenu,
                model.maybeThemePreference,
                h,
              ),
              Shared.headerGroupDivider('mx-2 md:hidden'),
              h.button(
                [
                  h.Class(
                    'md:hidden -mr-2 inline-flex size-8 items-center justify-center rounded-md text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:focus-visible:outline-accent-400',
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

export const footerView = (model: Model, h: ApplicationViewBuilder): Html =>
  h.footer(
    [
      h.Class(
        'px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:px-8 xl:px-12 mt-6 border-t border-gray-200 dark:border-gray-800',
      ),
    ],
    [
      h.p(
        [h.Class('text-base font-normal text-gray-900 dark:text-white mb-1')],
        ['Stay in the update loop.'],
      ),
      h.p(
        [h.Class('text-sm text-gray-700 dark:text-gray-300 mb-4')],
        ['New releases, patterns, and the occasional deep dive.'],
      ),
      Shared.emailForm(
        model.newsletterEmail,
        value => Message.UpdatedNewsletterEmail({ value }),
        h,
      ),
      h.hr([
        h.Class(
          'my-6 -mx-6 md:-mx-8 xl:-mx-12 border-t border-gray-200 dark:border-gray-800',
        ),
      ]),
      h.div(
        [h.Class('text-sm text-gray-600 dark:text-gray-400')],
        [
          h.p(
            [],
            [
              'Built with ',
              h.a(
                [
                  h.Href(
                    `${Link.websiteSource}/src/composition/composition.ts`,
                  ),
                  h.Class('link-accent'),
                ],
                ['Foldkit'],
              ),
              '.',
            ],
          ),
          h.p([h.Class('mt-1')], [`© ${model.currentYear} Devin Jameson`]),
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
  h: ApplicationViewBuilder,
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
            'text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider',
          ),
        ],
        [config.direction],
      ),
      h.span(
        [
          h.Class(
            'text-sm font-medium text-accent-700 dark:text-accent-400 group-hover:underline',
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

const pageNavigationView = (tag: string, h: ApplicationViewBuilder) => {
  const { maybePrevious, maybeNext } = pageNeighbors(tag)

  if (Option.isNone(maybePrevious) && Option.isNone(maybeNext)) {
    return h.empty
  }

  return h.nav(
    [
      h.AriaLabel('Page navigation'),
      h.Class(
        'flex items-stretch justify-between gap-4 mt-12 pt-6 border-t border-gray-200 dark:border-gray-800',
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
    Match.whenOr('GetStarted', 'WhyFoldkit', () => '8'),
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

const isWideContentRoute = ApplicationRoute.isAnyOf([
  'Examples',
  'ExampleDetail',
])

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

const renderApiReference = (
  apiReferenceModel: ApiReferenceBlockModel,
  moduleSlug: string,
  h: ApplicationViewBuilder,
): Html =>
  h.block(
    ApiReferenceBinding.embedView({
      slotId: `api-reference-${moduleSlug}`,
      model: apiReferenceModel,
      viewInputs: {
        moduleSlug,
        renderHeadingLink: Prose.renderHeadingLink(
          hash => Message.ClickedCopyLink({ hash }),
          h,
        ),
      },
    }),
  )

type DocPageView = (
  renderCopyButton: CodeBlock.RenderCopyButton,
  renderSnippet: CodeBlock.RenderSnippet,
  renderHeadingLink: Prose.RenderHeadingLink,
) => Html

type ProseDocPageView = (renderHeadingLink: Prose.RenderHeadingLink) => Html

const renderDocContent = (
  pageView: DocPageView,
  snippetCopy: SnippetCopyBlockModel,
  snippetDisclosure: SnippetDisclosureBlockModel,
  h: ApplicationViewBuilder,
): Html => {
  const renderCopyButton = SnippetCopyRenderer.renderer(snippetCopy, config =>
    h.block(SnippetCopyBinding.embedView(config)),
  )

  return pageView(
    renderCopyButton,
    SnippetDisclosureRenderer.renderer(
      snippetDisclosure,
      renderCopyButton,
      config => h.block(SnippetDisclosureBinding.embedView(config)),
    ),
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )
}

const renderProseContent = (
  pageView: ProseDocPageView,
  h: ApplicationViewBuilder,
): Html =>
  pageView(
    Prose.renderHeadingLink(hash => Message.ClickedCopyLink({ hash }), h),
  )

const memoizedDocContent = createLazy()
const memoizedProseContent = createLazy()

type DocContentArgs = readonly [
  SnippetCopyBlockModel,
  SnippetDisclosureBlockModel,
  ApplicationViewBuilder,
]

const lazyDocsContent = (view: DocPageView, args: DocContentArgs): Html =>
  memoizedDocContent(renderDocContent, [view, ...args])

const lazyProseContent = (
  view: ProseDocPageView,
  args: readonly [ApplicationViewBuilder],
): Html => memoizedProseContent(renderProseContent, [view, ...args])

const lazyApiReference = createLazy()

export const view = (
  model: Model,
  docsRoute: DocsRoute,
  h: ApplicationViewBuilder,
) => {
  const renderCopyButton = SnippetCopyRenderer.renderer(
    model.snippetCopy,
    config => h.block(SnippetCopyBinding.embedView(config)),
  )
  const renderSnippet = SnippetDisclosureRenderer.renderer(
    model.snippetDisclosure,
    renderCopyButton,
    config => h.block(SnippetDisclosureBinding.embedView(config)),
  )
  const renderHeadingLink = Prose.renderHeadingLink(
    hash => Message.ClickedCopyLink({ hash }),
    h,
  )
  const docContentArgs: DocContentArgs = [
    model.snippetCopy,
    model.snippetDisclosure,
    h,
  ]

  const { content, tableOfContents: currentPageTableOfContents } = Match.value(
    docsRoute,
  ).pipe(
    Match.withReturnType<DocsPageView>(),
    Match.tagsExhaustive({
      WhyFoldkit: () =>
        withTableOfContents(
          WhyFoldkit.view(renderHeadingLink),
          WhyFoldkit.tableOfContents,
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
          h.block(
            ComingFromReactBinding.embedView({
              slotId: 'coming-from-react',
              model: model.comingFromReact,
              viewInputs: {
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          ComingFromReact.tableOfContents,
        ),
      ComingFromTanStackQuery: () =>
        withTableOfContents(
          lazyDocsContent(ComingFromTanStackQuery.view, docContentArgs),
          ComingFromTanStackQuery.tableOfContents,
        ),
      ReactComparison: () =>
        withTableOfContents(
          lazyDocsContent(ReactComparison.view, docContentArgs),
          ReactComparison.tableOfContents,
        ),
      EffectAtomComparison: () =>
        withTableOfContents(
          lazyDocsContent(EffectAtomComparison.view, docContentArgs),
          EffectAtomComparison.tableOfContents,
        ),
      ElmComparison: () =>
        withTableOfContents(
          lazyDocsContent(ElmComparison.view, docContentArgs),
          ElmComparison.tableOfContents,
        ),
      GetStarted: () =>
        withTableOfContents(
          lazyDocsContent(GetStarted.view, docContentArgs),
          GetStarted.tableOfContents,
        ),
      RoutingAndNavigation: () =>
        withTableOfContents(
          lazyDocsContent(Routing.view, docContentArgs),
          Routing.tableOfContents,
        ),
      FieldValidation: () =>
        withTableOfContents(
          lazyDocsContent(FieldValidation.view, docContentArgs),
          FieldValidation.tableOfContents,
        ),
      Testing: () =>
        withTableOfContents(
          lazyDocsContent(Testing.view, docContentArgs),
          Testing.tableOfContents,
        ),
      TestingStory: () =>
        withTableOfContents(
          lazyDocsContent(TestingStory.view, docContentArgs),
          TestingStory.tableOfContents,
        ),
      TestingScene: () =>
        withTableOfContents(
          lazyDocsContent(TestingScene.view, docContentArgs),
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
          h.block(
            ExampleDetailBinding.embedView({
              slotId: `example-detail-${exampleSlug}`,
              model: model.exampleDetail,
              viewInputs: {
                slug: exampleSlug,
                isNarrowViewport: model.isNarrowViewport,
                renderSnippet,
              },
            }),
          ),
        ),
      BestPracticesSideEffects: () =>
        withTableOfContents(
          lazyDocsContent(
            BestPractices.SideEffectsAndPurity.view,
            docContentArgs,
          ),
          BestPractices.SideEffectsAndPurity.tableOfContents,
        ),
      BestPracticesMessages: () =>
        withTableOfContents(
          BestPractices.Messages.view(renderHeadingLink),
          BestPractices.Messages.tableOfContents,
        ),
      BestPracticesKeying: () =>
        withTableOfContents(
          lazyDocsContent(BestPractices.Keying.view, docContentArgs),
          BestPractices.Keying.tableOfContents,
        ),
      BestPracticesImmutability: () =>
        withTableOfContents(
          lazyDocsContent(BestPractices.Immutability.view, docContentArgs),
          BestPractices.Immutability.tableOfContents,
        ),
      PreviewMigration: () =>
        withTableOfContents(
          lazyDocsContent(PreviewMigration.view, docContentArgs),
          PreviewMigration.tableOfContents,
        ),
      PreviewUpgrade: () =>
        withTableOfContents(
          lazyDocsContent(PreviewUpgrade.view, docContentArgs),
          PreviewUpgrade.tableOfContents,
        ),
      ProjectOrganization: () =>
        withTableOfContents(
          lazyDocsContent(ProjectOrganization.view, docContentArgs),
          ProjectOrganization.tableOfContents,
        ),
      ToolingLinting: () =>
        withTableOfContents(
          lazyDocsContent(ToolingLinting.view, docContentArgs),
          ToolingLinting.tableOfContents,
        ),
      ApiModule: ({ moduleSlug }) => ({
        content: lazyApiReference(renderApiReference, [
          model.apiReference,
          moduleSlug,
          h,
        ]),
        tableOfContents: ApiReference.tableOfContentsFor(
          model.apiReference,
          moduleSlug,
        ),
      }),
      CoreArchitecture: () =>
        withTableOfContents(
          Core.Architecture.view(renderHeadingLink),
          Core.Architecture.tableOfContents,
        ),
      CoreCounterExample: () =>
        withTableOfContents(
          lazyDocsContent(Core.CounterExample.view, docContentArgs),
          Core.CounterExample.tableOfContents,
        ),
      CoreModel: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreModel.view, docContentArgs),
          Core.CoreModel.tableOfContents,
        ),
      CoreMessages: () =>
        withTableOfContents(
          lazyDocsContent(Core.Messages.view, docContentArgs),
          Core.Messages.tableOfContents,
        ),
      CoreUpdate: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreUpdate.view, docContentArgs),
          Core.CoreUpdate.tableOfContents,
        ),
      CoreView: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreView.view, docContentArgs),
          Core.CoreView.tableOfContents,
        ),
      CoreCommands: () =>
        withTableOfContents(
          lazyDocsContent(Core.Commands.view, docContentArgs),
          Core.Commands.tableOfContents,
        ),
      CoreMount: () =>
        withTableOfContents(
          lazyDocsContent(Core.Mount.view, docContentArgs),
          Core.Mount.tableOfContents,
        ),
      CoreCustomElement: () =>
        withTableOfContents(
          lazyDocsContent(Core.CustomElement.view, docContentArgs),
          Core.CustomElement.tableOfContents,
        ),
      CoreSubscriptions: () =>
        withTableOfContents(
          lazyDocsContent(Core.Subscriptions.view, docContentArgs),
          Core.Subscriptions.tableOfContents,
        ),
      CoreInitAndFlags: () =>
        withTableOfContents(
          lazyDocsContent(Core.InitAndFlags.view, docContentArgs),
          Core.InitAndFlags.tableOfContents,
        ),
      CoreDom: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreDom.view, docContentArgs),
          Core.CoreDom.tableOfContents,
        ),
      CoreRender: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreRender.view, docContentArgs),
          Core.CoreRender.tableOfContents,
        ),
      CoreFile: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreFile.view, docContentArgs),
          Core.CoreFile.tableOfContents,
        ),
      CoreHttp: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreHttp.view, docContentArgs),
          Core.CoreHttp.tableOfContents,
        ),
      CoreQuery: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreQuery.view, docContentArgs),
          Core.CoreQuery.tableOfContents,
        ),
      CoreCanvas: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreCanvas.view, docContentArgs),
          Core.CoreCanvas.tableOfContents,
        ),
      CoreRuntime: () =>
        withTableOfContents(
          lazyDocsContent(Core.Runtime.view, docContentArgs),
          Core.Runtime.tableOfContents,
        ),
      CoreServerRendering: () =>
        withTableOfContents(
          lazyDocsContent(Core.CoreServerRendering.view, docContentArgs),
          Core.CoreServerRendering.tableOfContents,
        ),
      CoreLayers: () =>
        withTableOfContents(
          lazyDocsContent(Core.Layers.view, docContentArgs),
          Core.Layers.tableOfContents,
        ),
      CoreManagedResources: () =>
        withTableOfContents(
          lazyDocsContent(Core.ManagedResources.view, docContentArgs),
          Core.ManagedResources.tableOfContents,
        ),
      CoreDevTools: () =>
        withTableOfContents(
          lazyDocsContent(Core.DevTools.view, docContentArgs),
          Core.DevTools.tableOfContents,
        ),
      CoreCrashView: () =>
        withTableOfContents(
          lazyDocsContent(Core.CrashView.view, docContentArgs),
          Core.CrashView.tableOfContents,
        ),
      CoreViewTransitions: () =>
        withTableOfContents(
          lazyDocsContent(Core.ViewTransitions.view, docContentArgs),
          Core.ViewTransitions.tableOfContents,
        ),
      CoreSlowWarnings: () =>
        withTableOfContents(
          lazyDocsContent(Core.Slow.view, docContentArgs),
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
      CoreBlock: () =>
        withTableOfContents(
          h.block(
            CoreBlockPageBinding.embedView({
              slotId: 'core-block-page',
              model: model.coreBlockPage,
              viewInputs: {
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          CoreBlockMetadata.tableOfContents,
        ),
      CoreMachine: () =>
        withTableOfContents(
          lazyDocsContent(Core.Machine.view, docContentArgs),
          Core.Machine.tableOfContents,
        ),
      AsyncData: () =>
        withTableOfContents(
          lazyDocsContent(AsyncDataPage.view, docContentArgs),
          AsyncDataPage.tableOfContents,
        ),
      PatternsAntiPatterns: () =>
        withTableOfContents(
          lazyDocsContent(Patterns.AntiPatterns.view, docContentArgs),
          Patterns.AntiPatterns.tableOfContents,
        ),
      PatternsInformingBlocks: () =>
        withTableOfContents(
          lazyDocsContent(Patterns.InformingBlocks.view, docContentArgs),
          Patterns.InformingBlocks.tableOfContents,
        ),
      PatternsSubscriptionOrganization: () =>
        withTableOfContents(
          lazyDocsContent(
            Patterns.SubscriptionOrganization.view,
            docContentArgs,
          ),
          Patterns.SubscriptionOrganization.tableOfContents,
        ),
      CoreViewMemoization: () =>
        withTableOfContents(
          lazyDocsContent(Core.ViewMemoization.view, docContentArgs),
          Core.ViewMemoization.tableOfContents,
        ),
      CoreEmbedding: () =>
        withTableOfContents(
          lazyDocsContent(Core.Embedding.view, docContentArgs),
          Core.Embedding.tableOfContents,
        ),
      UiOverview: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Overview',
              model: model.uiPages,
              viewInputs: {
                page: 'Overview',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Overview'),
        ),
      UiSelectionBlocks: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-SelectionBlocks',
              model: model.uiPages,
              viewInputs: {
                page: 'SelectionBlocks',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('SelectionBlocks'),
        ),
      UiAnchor: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Anchor',
              model: model.uiPages,
              viewInputs: {
                page: 'Anchor',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Anchor'),
        ),
      UiHoverIntent: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-HoverIntent',
              model: model.uiPages,
              viewInputs: {
                page: 'HoverIntent',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('HoverIntent'),
        ),
      UiButton: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Button',
              model: model.uiPages,
              viewInputs: {
                page: 'Button',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Button'),
        ),
      UiTabs: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Tabs',
              model: model.uiPages,
              viewInputs: {
                page: 'Tabs',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Tabs'),
        ),
      UiNav: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Nav',
              model: model.uiPages,
              viewInputs: {
                page: 'Nav',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Nav'),
        ),
      UiDisclosure: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Disclosure',
              model: model.uiPages,
              viewInputs: {
                page: 'Disclosure',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Disclosure'),
        ),
      UiDialog: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Dialog',
              model: model.uiPages,
              viewInputs: {
                page: 'Dialog',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Dialog'),
        ),
      UiMenu: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Menu',
              model: model.uiPages,
              viewInputs: {
                page: 'Menu',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Menu'),
        ),
      UiPopover: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Popover',
              model: model.uiPages,
              viewInputs: {
                page: 'Popover',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Popover'),
        ),
      UiTooltip: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Tooltip',
              model: model.uiPages,
              viewInputs: {
                page: 'Tooltip',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Tooltip'),
        ),
      UiToast: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Toast',
              model: model.uiPages,
              viewInputs: {
                page: 'Toast',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Toast'),
        ),
      UiListbox: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Listbox',
              model: model.uiPages,
              viewInputs: {
                page: 'Listbox',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Listbox'),
        ),
      UiRadioGroup: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-RadioGroup',
              model: model.uiPages,
              viewInputs: {
                page: 'RadioGroup',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('RadioGroup'),
        ),
      UiSlider: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Slider',
              model: model.uiPages,
              viewInputs: {
                page: 'Slider',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Slider'),
        ),
      UiMeter: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Meter',
              model: model.uiPages,
              viewInputs: {
                page: 'Meter',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Meter'),
        ),
      UiProgress: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Progress',
              model: model.uiPages,
              viewInputs: {
                page: 'Progress',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Progress'),
        ),
      UiSwitch: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Switch',
              model: model.uiPages,
              viewInputs: {
                page: 'Switch',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Switch'),
        ),
      UiCalendar: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Calendar',
              model: model.uiPages,
              viewInputs: {
                page: 'Calendar',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Calendar'),
        ),
      UiDatePicker: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-DatePicker',
              model: model.uiPages,
              viewInputs: {
                page: 'DatePicker',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('DatePicker'),
        ),
      UiCheckbox: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Checkbox',
              model: model.uiPages,
              viewInputs: {
                page: 'Checkbox',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Checkbox'),
        ),
      UiCombobox: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Combobox',
              model: model.uiPages,
              viewInputs: {
                page: 'Combobox',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Combobox'),
        ),
      UiInput: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Input',
              model: model.uiPages,
              viewInputs: {
                page: 'Input',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Input'),
        ),
      UiTextarea: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Textarea',
              model: model.uiPages,
              viewInputs: {
                page: 'Textarea',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Textarea'),
        ),
      UiFieldset: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Fieldset',
              model: model.uiPages,
              viewInputs: {
                page: 'Fieldset',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Fieldset'),
        ),
      UiSelect: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Select',
              model: model.uiPages,
              viewInputs: {
                page: 'Select',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Select'),
        ),
      UiDragAndDrop: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-DragAndDrop',
              model: model.uiPages,
              viewInputs: {
                page: 'DragAndDrop',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('DragAndDrop'),
        ),
      UiFileDrop: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-FileDrop',
              model: model.uiPages,
              viewInputs: {
                page: 'FileDrop',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('FileDrop'),
        ),
      UiAnimation: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-Animation',
              model: model.uiPages,
              viewInputs: {
                page: 'Animation',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('Animation'),
        ),
      UiVirtualList: () =>
        withTableOfContents(
          h.block(
            UiPagesBinding.embedView({
              slotId: 'ui-VirtualList',
              model: model.uiPages,
              viewInputs: {
                page: 'VirtualList',
                url: model.url,
                renderCopyButton,
                renderSnippet,
                renderHeadingLink,
              },
            }),
          ),
          UiDocumentation.tableOfContentsFor('VirtualList'),
        ),
      AiOverview: () =>
        withTableOfContents(
          lazyDocsContent(AiOverview.view, docContentArgs),
          AiOverview.tableOfContents,
        ),
      AiSkills: () =>
        withTableOfContents(
          lazyDocsContent(AiSkills.view, docContentArgs),
          AiSkills.tableOfContents,
        ),
      AiMcp: () =>
        withTableOfContents(
          lazyDocsContent(AiMcp.view, docContentArgs),
          AiMcp.tableOfContents,
        ),
      ContentApi: () =>
        withTableOfContents(
          lazyDocsContent(ContentApi.view, docContentArgs),
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
    [
      h.Class('flex flex-col min-h-screen'),
      ...(Option.isSome(model.maybeIsPlaygroundSupported)
        ? [h.DataAttribute('browser-environment-loaded', '')]
        : []),
    ],
    [
      Shared.skipNavLink,
      headerView(model, h),
      Search.dialogView(model, h),
      h.div(
        [
          h.Class(
            clsx('docs-shell flex flex-1 pt-[var(--header-height)] md:pl-64', {
              'xl:pr-64': Option.isSome(currentPageTableOfContents),
            }),
          ),
        ],
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
              h.div([PagefindIgnore], [footerView(model, h)]),
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
