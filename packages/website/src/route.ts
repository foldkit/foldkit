import { Option, Schema, String, pipe } from 'effect'
import {
  type Transition,
  defineRouteUnion,
  literal,
  mapTo,
  oneOf,
  parseUrlWithFallback,
  root,
  schemaSegment,
  slash,
  string,
} from 'foldkit/route'
import type { CallableTaggedStruct } from 'foldkit/schema'

// ROUTE SCHEMAS

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  WhyFoldkit: {},
  Performance: {},
  ComingFromReact: {},
  ComingFromTanStackQuery: {},
  ReactComparison: {},
  EffectAtomComparison: {},
  ElmComparison: {},
  GetStarted: {},
  Roadmap: {},
  RoutingAndNavigation: {},
  FieldValidation: {},
  Testing: {},
  TestingStory: {},
  TestingScene: {},
  Examples: {},
  ExampleDetail: { exampleSlug: Schema.String },
  TypingTerminal: {},
  Playground: { exampleSlug: Schema.String },
  BestPracticesSideEffects: {},
  BestPracticesMessages: {},
  BestPracticesKeying: {},
  BestPracticesImmutability: {},
  PreviewMigration: {},
  PreviewUpgrade: {},
  ProjectOrganization: {},
  ToolingLinting: {},
  ApiModule: { moduleSlug: Schema.String },
  CoreArchitecture: {},
  CoreCounterExample: {},
  CoreModel: {},
  CoreMessages: {},
  CoreUpdate: {},
  CoreView: {},
  CoreCommands: {},
  CoreMount: {},
  CoreCustomElement: {},
  CoreSubscriptions: {},
  CoreInitAndFlags: {},
  CoreDom: {},
  CoreRender: {},
  CoreFile: {},
  CoreHttp: {},
  CoreQuery: {},
  CoreCanvas: {},
  CoreRuntime: {},
  CoreServerRendering: {},
  CoreLayers: {},
  CoreManagedResources: {},
  CoreDevTools: {},
  CoreCrashView: {},
  CoreViewTransitions: {},
  CoreSlowWarnings: {},
  CoreFreezeModel: {},
  CorePreserveScroll: {},
  CoreViewMemoization: {},
  CoreEmbedding: {},
  CoreBlock: {},
  CoreMachine: {},
  AsyncData: {},
  PatternsAntiPatterns: {},
  PatternsInformingBlocks: {},
  PatternsSubscriptionOrganization: {},
  UiOverview: {},
  UiSelectionBlocks: {},
  UiButton: {},
  UiCalendar: {},
  UiDatePicker: {},
  UiCheckbox: {},
  UiTabs: {},
  UiNav: {},
  UiDisclosure: {},
  UiDialog: {},
  UiMenu: {},
  UiPopover: {},
  UiListbox: {},
  UiRadioGroup: {},
  UiSelect: {},
  UiSlider: {},
  UiMeter: {},
  UiProgress: {},
  UiSwitch: {},
  UiCombobox: {},
  UiInput: {},
  UiTextarea: {},
  UiFieldset: {},
  UiDragAndDrop: {},
  UiFileDrop: {},
  UiHoverIntent: {},
  UiToast: {},
  UiTooltip: {},
  UiAnimation: {},
  UiAnchor: {},
  UiVirtualList: {},
  About: {},
  Contact: {},
  Privacy: {},
  ContentApi: {},
  AiOverview: {},
  AiSkills: {},
  AiMcp: {},
  Newsletter: {},
  Blog: {},
  BlogPost: { postSlug: Schema.String },
  NotFound: { path: Schema.String },
})

export type ApplicationTransition = Transition.Transition<
  typeof ApplicationRoute.Type
>

export const maybeExampleSlugForRoute = (
  route: typeof ApplicationRoute.Type,
): Option.Option<string> =>
  route._tag === 'ExampleDetail'
    ? Option.some(route.exampleSlug)
    : Option.none()

export const DocsRoute = ApplicationRoute.subset([
  'WhyFoldkit',
  'Performance',
  'ComingFromReact',
  'ComingFromTanStackQuery',
  'ReactComparison',
  'EffectAtomComparison',
  'ElmComparison',
  'GetStarted',
  'Roadmap',
  'RoutingAndNavigation',
  'FieldValidation',
  'Testing',
  'TestingStory',
  'TestingScene',
  'Examples',
  'ExampleDetail',
  'TypingTerminal',
  'BestPracticesSideEffects',
  'BestPracticesMessages',
  'BestPracticesKeying',
  'BestPracticesImmutability',
  'PreviewMigration',
  'PreviewUpgrade',
  'ProjectOrganization',
  'ToolingLinting',
  'ApiModule',
  'CoreArchitecture',
  'CoreCounterExample',
  'CoreModel',
  'CoreMessages',
  'CoreUpdate',
  'CoreView',
  'CoreCommands',
  'CoreMount',
  'CoreCustomElement',
  'CoreSubscriptions',
  'CoreInitAndFlags',
  'CoreDom',
  'CoreRender',
  'CoreFile',
  'CoreHttp',
  'CoreQuery',
  'CoreCanvas',
  'CoreRuntime',
  'CoreServerRendering',
  'CoreLayers',
  'CoreManagedResources',
  'CoreDevTools',
  'CoreCrashView',
  'CoreViewTransitions',
  'CoreSlowWarnings',
  'CoreFreezeModel',
  'CorePreserveScroll',
  'CoreViewMemoization',
  'CoreEmbedding',
  'CoreBlock',
  'CoreMachine',
  'AsyncData',
  'PatternsAntiPatterns',
  'PatternsInformingBlocks',
  'PatternsSubscriptionOrganization',
  'UiOverview',
  'UiSelectionBlocks',
  'UiButton',
  'UiCalendar',
  'UiDatePicker',
  'UiCheckbox',
  'UiTabs',
  'UiNav',
  'UiDisclosure',
  'UiDialog',
  'UiMenu',
  'UiPopover',
  'UiListbox',
  'UiRadioGroup',
  'UiSelect',
  'UiSlider',
  'UiMeter',
  'UiProgress',
  'UiSwitch',
  'UiCombobox',
  'UiInput',
  'UiTextarea',
  'UiFieldset',
  'UiDragAndDrop',
  'UiFileDrop',
  'UiHoverIntent',
  'UiToast',
  'UiTooltip',
  'UiAnimation',
  'UiAnchor',
  'UiVirtualList',
  'AiOverview',
  'AiSkills',
  'AiMcp',
  'About',
  'Contact',
  'Privacy',
  'ContentApi',
  'NotFound',
])

export const isPlaygroundRoute = ApplicationRoute.isAnyOf(['Playground'])

export const isBlogRoute = ApplicationRoute.isAnyOf(['Blog', 'BlogPost'])

const isMarketingRoute = ApplicationRoute.isAnyOf(['Home', 'Newsletter'])

const isDocsUnionRoute = Schema.is(DocsRoute)

export const isSearchRoute = (route: typeof ApplicationRoute.Type): boolean =>
  isDocsUnionRoute(route) || isBlogRoute(route) || isMarketingRoute(route)

/**
 * Whether a route belongs to the documentation section, which is what the
 * header's `Docs` link highlights on. Derived from `DocsRoute` so a new
 * top-level route cannot silently join the section. `NotFound` is a member of
 * the union so 404s render in the docs shell, but it belongs to no section.
 */
export const isDocsSectionRoute = (
  route: typeof ApplicationRoute.Type,
): boolean => isDocsUnionRoute(route) && route._tag !== 'NotFound'

// ROUTERS

type StaticRouteConstructor<Tag extends string> = CallableTaggedStruct<Tag, {}>

const staticPage = <Tag extends string>(
  slug: string,
  route: StaticRouteConstructor<Tag>,
) => pipe(literal(slug), mapTo(route))

const section =
  (sectionSlug: string) =>
  <Tag extends string>(pageSlug: string, route: StaticRouteConstructor<Tag>) =>
    pipe(literal(sectionSlug), slash(literal(pageSlug)), mapTo(route))

const getStarted = section('get-started')
const introduction = section('introduction')
const faq = section('faq')
const react = section('react')
const elm = section('elm')
const core = section('core')
const patterns = section('patterns')
const tooling = section('tooling')
const testing = section('testing')
const bestPractices = section('best-practices')
const ui = section('ui')
const ai = section('ai')

export const homeRouter = pipe(root, mapTo(ApplicationRoute.Home))

export const whyFoldkitRouter = introduction(
  'why-foldkit',
  ApplicationRoute.WhyFoldkit,
)
export const getStartedRouter = staticPage(
  'get-started',
  ApplicationRoute.GetStarted,
)

export const roadmapRouter = introduction('roadmap', ApplicationRoute.Roadmap)

const whyFoldkitFromGetStarted = getStarted(
  'why-foldkit',
  ApplicationRoute.WhyFoldkit,
)
const getStartedFromNested = getStarted(
  'getting-started',
  ApplicationRoute.GetStarted,
)
const roadmapFromRoot = staticPage('roadmap', ApplicationRoute.Roadmap)

export const performanceRouter = faq(
  'performance',
  ApplicationRoute.Performance,
)

export const comingFromReactRouter = react(
  'coming-from-react',
  ApplicationRoute.ComingFromReact,
)
export const comingFromTanStackQueryRouter = react(
  'coming-from-tanstack-query',
  ApplicationRoute.ComingFromTanStackQuery,
)
export const reactComparisonRouter = react(
  'foldkit-vs-react-side-by-side',
  ApplicationRoute.ReactComparison,
)
export const effectAtomComparisonRouter = react(
  'foldkit-vs-react-effect-atom',
  ApplicationRoute.EffectAtomComparison,
)
export const elmComparisonRouter = elm(
  'foldkit-vs-elm-side-by-side',
  ApplicationRoute.ElmComparison,
)

export const routingAndNavigationRouter = core(
  'routing-and-navigation',
  ApplicationRoute.RoutingAndNavigation,
)
export const fieldValidationRouter = core(
  'field-validation',
  ApplicationRoute.FieldValidation,
)

export const testingRouter = staticPage('testing', ApplicationRoute.Testing)
export const testingStoryRouter = testing(
  'story',
  ApplicationRoute.TestingStory,
)
export const testingSceneRouter = testing(
  'scene',
  ApplicationRoute.TestingScene,
)

export const examplesRouter = staticPage(
  'example-apps',
  ApplicationRoute.Examples,
)
export const exampleDetailRouter = pipe(
  literal('example-apps'),
  slash(string('exampleSlug')),
  mapTo(ApplicationRoute.ExampleDetail),
)
export const typingTerminalRouter = pipe(
  literal('example-apps'),
  slash(literal('typing-terminal')),
  mapTo(ApplicationRoute.TypingTerminal),
)

export const playgroundRouter = pipe(
  literal('playground'),
  slash(string('exampleSlug')),
  mapTo(ApplicationRoute.Playground),
)

export const bestPracticesSideEffectsRouter = bestPractices(
  'side-effects-and-purity',
  ApplicationRoute.BestPracticesSideEffects,
)
export const bestPracticesMessagesRouter = bestPractices(
  'messages',
  ApplicationRoute.BestPracticesMessages,
)
export const bestPracticesKeyingRouter = bestPractices(
  'keying',
  ApplicationRoute.BestPracticesKeying,
)
export const bestPracticesImmutabilityRouter = bestPractices(
  'immutability',
  ApplicationRoute.BestPracticesImmutability,
)

export const previewMigrationRouter = staticPage(
  'preview-migration',
  ApplicationRoute.PreviewMigration,
)
export const previewUpgradeRouter = staticPage(
  'preview-upgrade',
  ApplicationRoute.PreviewUpgrade,
)

export const projectOrganizationRouter = patterns(
  'project-organization',
  ApplicationRoute.ProjectOrganization,
)
export const toolingLintingRouter = tooling(
  'oxlint-plugin',
  ApplicationRoute.ToolingLinting,
)

export const apiModuleRouter = pipe(
  literal('api-reference'),
  slash(string('moduleSlug')),
  mapTo(ApplicationRoute.ApiModule),
)

export const coreArchitectureRouter = core(
  'architecture',
  ApplicationRoute.CoreArchitecture,
)
export const coreCounterExampleRouter = core(
  'counter-example',
  ApplicationRoute.CoreCounterExample,
)
export const coreModelRouter = core('model', ApplicationRoute.CoreModel)
export const coreMessagesRouter = core(
  'messages',
  ApplicationRoute.CoreMessages,
)
export const coreUpdateRouter = core('update', ApplicationRoute.CoreUpdate)
export const coreViewRouter = core('view', ApplicationRoute.CoreView)
export const coreCommandsRouter = core(
  'commands',
  ApplicationRoute.CoreCommands,
)
export const coreMountRouter = core('mount', ApplicationRoute.CoreMount)
export const coreCustomElementRouter = core(
  'custom-element',
  ApplicationRoute.CoreCustomElement,
)
export const coreSubscriptionsRouter = core(
  'subscriptions',
  ApplicationRoute.CoreSubscriptions,
)
export const coreInitAndFlagsRouter = core(
  'init-and-flags',
  ApplicationRoute.CoreInitAndFlags,
)
export const coreDomRouter = core('dom', ApplicationRoute.CoreDom)
export const coreRenderRouter = core('render', ApplicationRoute.CoreRender)
export const coreFileRouter = core('file', ApplicationRoute.CoreFile)
export const coreHttpRouter = core('http', ApplicationRoute.CoreHttp)
export const coreQueryRouter = core('query', ApplicationRoute.CoreQuery)
export const coreCanvasRouter = core('canvas', ApplicationRoute.CoreCanvas)
export const coreRuntimeRouter = core('runtime', ApplicationRoute.CoreRuntime)
export const coreServerRenderingRouter = core(
  'server-rendering',
  ApplicationRoute.CoreServerRendering,
)
export const coreLayersRouter = core('layers', ApplicationRoute.CoreLayers)
const coreResourcesParser = core('resources', ApplicationRoute.CoreLayers)
export const coreManagedResourcesRouter = core(
  'managed-resources',
  ApplicationRoute.CoreManagedResources,
)
export const coreDevToolsRouter = core(
  'devtools',
  ApplicationRoute.CoreDevTools,
)
export const coreCrashViewRouter = core(
  'crash-view',
  ApplicationRoute.CoreCrashView,
)
export const coreViewTransitionsRouter = core(
  'view-transitions',
  ApplicationRoute.CoreViewTransitions,
)
export const coreSlowWarningsRouter = core(
  'slow-warnings',
  ApplicationRoute.CoreSlowWarnings,
)
export const coreFreezeModelRouter = core(
  'freeze-model',
  ApplicationRoute.CoreFreezeModel,
)
export const corePreserveScrollRouter = core(
  'preserve-scroll',
  ApplicationRoute.CorePreserveScroll,
)
export const coreViewMemoizationRouter = core(
  'view-memoization',
  ApplicationRoute.CoreViewMemoization,
)
export const coreEmbeddingRouter = core(
  'embedding',
  ApplicationRoute.CoreEmbedding,
)
export const coreBlockRouter = core('block', ApplicationRoute.CoreBlock)
const legacyCoreBlockParser = core('submodel', ApplicationRoute.CoreBlock)
export const coreMachineRouter = core('machine', ApplicationRoute.CoreMachine)
export const asyncDataRouter = core('async-data', ApplicationRoute.AsyncData)

export const patternsAntiPatternsRouter = patterns(
  'anti-patterns',
  ApplicationRoute.PatternsAntiPatterns,
)
export const patternsInformingBlocksRouter = patterns(
  'informing-blocks',
  ApplicationRoute.PatternsInformingBlocks,
)
const legacyPatternsInformingBlocksParser = patterns(
  'informing-submodels',
  ApplicationRoute.PatternsInformingBlocks,
)
export const patternsSubscriptionOrganizationRouter = patterns(
  'subscription-organization',
  ApplicationRoute.PatternsSubscriptionOrganization,
)
export const uiOverviewRouter = ui('overview', ApplicationRoute.UiOverview)
export const uiSelectionBlocksRouter = ui(
  'selection-blocks',
  ApplicationRoute.UiSelectionBlocks,
)
const legacyUiSelectionBlocksParser = ui(
  'selection-submodels',
  ApplicationRoute.UiSelectionBlocks,
)
export const uiButtonRouter = ui('button', ApplicationRoute.UiButton)
export const uiCalendarRouter = ui('calendar', ApplicationRoute.UiCalendar)
export const uiDatePickerRouter = ui(
  'date-picker',
  ApplicationRoute.UiDatePicker,
)
export const uiCheckboxRouter = ui('checkbox', ApplicationRoute.UiCheckbox)
export const uiTabsRouter = ui('tabs', ApplicationRoute.UiTabs)
export const uiNavRouter = ui('nav', ApplicationRoute.UiNav)
export const uiDisclosureRouter = ui(
  'disclosure',
  ApplicationRoute.UiDisclosure,
)
export const uiDialogRouter = ui('dialog', ApplicationRoute.UiDialog)
export const uiMenuRouter = ui('menu', ApplicationRoute.UiMenu)
export const uiPopoverRouter = ui('popover', ApplicationRoute.UiPopover)
export const uiListboxRouter = ui('listbox', ApplicationRoute.UiListbox)
export const uiRadioGroupRouter = ui(
  'radio-group',
  ApplicationRoute.UiRadioGroup,
)
export const uiSelectRouter = ui('select', ApplicationRoute.UiSelect)
export const uiSliderRouter = ui('slider', ApplicationRoute.UiSlider)
export const uiMeterRouter = ui('meter', ApplicationRoute.UiMeter)
export const uiProgressRouter = ui('progress', ApplicationRoute.UiProgress)
export const uiSwitchRouter = ui('switch', ApplicationRoute.UiSwitch)
export const uiComboboxRouter = ui('combobox', ApplicationRoute.UiCombobox)
export const uiInputRouter = ui('input', ApplicationRoute.UiInput)
export const uiTextareaRouter = ui('textarea', ApplicationRoute.UiTextarea)
export const uiFieldsetRouter = ui('fieldset', ApplicationRoute.UiFieldset)
export const uiDragAndDropRouter = ui(
  'drag-and-drop',
  ApplicationRoute.UiDragAndDrop,
)
export const uiFileDropRouter = ui('file-drop', ApplicationRoute.UiFileDrop)
export const uiHoverIntentRouter = ui(
  'hover-intent',
  ApplicationRoute.UiHoverIntent,
)
export const uiToastRouter = ui('toast', ApplicationRoute.UiToast)
export const uiTooltipRouter = ui('tooltip', ApplicationRoute.UiTooltip)
export const uiAnimationRouter = ui('animation', ApplicationRoute.UiAnimation)
export const uiAnchorRouter = ui('anchor', ApplicationRoute.UiAnchor)
export const uiVirtualListRouter = ui(
  'virtual-list',
  ApplicationRoute.UiVirtualList,
)

export const aboutRouter = staticPage('about', ApplicationRoute.About)
export const contactRouter = staticPage('contact', ApplicationRoute.Contact)
export const privacyRouter = staticPage('privacy', ApplicationRoute.Privacy)
export const contentApiRouter = staticPage('api', ApplicationRoute.ContentApi)

export const aiOverviewRouter = ai('overview', ApplicationRoute.AiOverview)
export const aiSkillsRouter = ai('skills', ApplicationRoute.AiSkills)
export const aiMcpRouter = ai('mcp', ApplicationRoute.AiMcp)

// PARSER

const introductionParser = oneOf(
  whyFoldkitRouter,
  roadmapRouter,
  whyFoldkitFromGetStarted,
  roadmapFromRoot,
)

const faqParser = performanceRouter

const reactParser = oneOf(
  comingFromReactRouter,
  comingFromTanStackQueryRouter,
  reactComparisonRouter,
  effectAtomComparisonRouter,
)

const elmParser = elmComparisonRouter

const testingParser = oneOf(
  testingStoryRouter,
  testingSceneRouter,
  testingRouter,
)

const examplesParser = oneOf(
  typingTerminalRouter,
  exampleDetailRouter,
  examplesRouter,
)

const coreParser = oneOf(
  coreArchitectureRouter,
  coreCounterExampleRouter,
  coreModelRouter,
  coreMessagesRouter,
  coreUpdateRouter,
  coreViewRouter,
  coreCommandsRouter,
  coreMountRouter,
  coreCustomElementRouter,
  coreSubscriptionsRouter,
  coreInitAndFlagsRouter,
  coreDomRouter,
  coreRenderRouter,
  coreFileRouter,
  coreHttpRouter,
  coreQueryRouter,
  coreCanvasRouter,
  coreRuntimeRouter,
  coreServerRenderingRouter,
  coreLayersRouter,
  coreResourcesParser,
  coreManagedResourcesRouter,
  coreDevToolsRouter,
  coreCrashViewRouter,
  coreViewTransitionsRouter,
  coreSlowWarningsRouter,
  coreFreezeModelRouter,
  corePreserveScrollRouter,
  coreViewMemoizationRouter,
  coreEmbeddingRouter,
  coreBlockRouter,
  legacyCoreBlockParser,
  coreMachineRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
  asyncDataRouter,
)

const patternsParser = oneOf(
  patternsAntiPatternsRouter,
  patternsInformingBlocksRouter,
  legacyPatternsInformingBlocksParser,
  patternsSubscriptionOrganizationRouter,
  projectOrganizationRouter,
)

const toolingParser = toolingLintingRouter

const bestPracticesParser = oneOf(
  bestPracticesSideEffectsRouter,
  bestPracticesMessagesRouter,
  bestPracticesKeyingRouter,
  bestPracticesImmutabilityRouter,
)

const uiParser = oneOf(
  uiOverviewRouter,
  uiSelectionBlocksRouter,
  legacyUiSelectionBlocksParser,
  uiButtonRouter,
  uiCalendarRouter,
  uiDatePickerRouter,
  uiCheckboxRouter,
  uiTabsRouter,
  uiNavRouter,
  uiDisclosureRouter,
  uiDialogRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiListboxRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSliderRouter,
  uiMeterRouter,
  uiProgressRouter,
  uiSwitchRouter,
  uiComboboxRouter,
  uiInputRouter,
  uiTextareaRouter,
  uiFieldsetRouter,
  uiDragAndDropRouter,
  uiFileDropRouter,
  uiHoverIntentRouter,
  uiToastRouter,
  uiTooltipRouter,
  uiAnimationRouter,
  uiAnchorRouter,
  uiVirtualListRouter,
)

const aiParser = oneOf(aiOverviewRouter, aiSkillsRouter, aiMcpRouter)

const siteParser = oneOf(
  aboutRouter,
  contactRouter,
  privacyRouter,
  contentApiRouter,
)

const getStartedParser = oneOf(getStartedFromNested, getStartedRouter)

export const previewDocumentationEnabled =
  import.meta.env?.VITE_FOLDKIT_PREVIEW_RELEASE !== undefined

const docsParser = oneOf(
  getStartedParser,
  ...(previewDocumentationEnabled
    ? [previewMigrationRouter, previewUpgradeRouter]
    : []),
  introductionParser,
  faqParser,
  reactParser,
  elmParser,
  coreParser,
  patternsParser,
  toolingParser,
  bestPracticesParser,
  testingParser,
  examplesParser,
  uiParser,
  aiParser,
  siteParser,
)

export const newsletterRouter = staticPage(
  'newsletter',
  ApplicationRoute.Newsletter,
)

export const blogRouter = staticPage('blog', ApplicationRoute.Blog)

// NOTE: post slugs come from markdown filenames and stay kebab-case.
// Constraining the segment keeps sibling static files like `/blog/rss.xml`
// out of this route, so wherever the file itself is not served first (the dev
// server, an SPA-first host) the path falls through to `NotFound` instead of
// rendering a post shell around a missing post.
export const BLOG_POST_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const blogPostRouter = pipe(
  literal('blog'),
  slash(
    schemaSegment(
      'postSlug',
      Schema.String.check(Schema.isPattern(BLOG_POST_SLUG_PATTERN)),
    ),
  ),
  mapTo(ApplicationRoute.BlogPost),
)

const blogParser = oneOf(blogPostRouter, blogRouter)

export const routeParser = oneOf(
  docsParser,
  apiModuleRouter,
  newsletterRouter,
  blogParser,
  playgroundRouter,
  homeRouter,
)

export const urlToApplicationRoute = parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

// URLS

export const SITE_URL = 'https://foldkit.dev'

export const routeToUrlPath = (route: typeof ApplicationRoute.Type): string =>
  ApplicationRoute.match(route, {
    Home: () => homeRouter(),
    WhyFoldkit: () => whyFoldkitRouter(),
    Performance: () => performanceRouter(),
    GetStarted: () => getStartedRouter(),
    Roadmap: () => roadmapRouter(),
    ComingFromReact: () => comingFromReactRouter(),
    ComingFromTanStackQuery: () => comingFromTanStackQueryRouter(),
    ReactComparison: () => reactComparisonRouter(),
    EffectAtomComparison: () => effectAtomComparisonRouter(),
    ElmComparison: () => elmComparisonRouter(),
    RoutingAndNavigation: () => routingAndNavigationRouter(),
    FieldValidation: () => fieldValidationRouter(),
    Testing: () => testingRouter(),
    TestingStory: () => testingStoryRouter(),
    TestingScene: () => testingSceneRouter(),
    Examples: () => examplesRouter(),
    ExampleDetail: ({ exampleSlug }) => exampleDetailRouter({ exampleSlug }),
    TypingTerminal: () => typingTerminalRouter(),
    BestPracticesSideEffects: () => bestPracticesSideEffectsRouter(),
    BestPracticesMessages: () => bestPracticesMessagesRouter(),
    BestPracticesKeying: () => bestPracticesKeyingRouter(),
    BestPracticesImmutability: () => bestPracticesImmutabilityRouter(),
    PreviewMigration: () => previewMigrationRouter(),
    PreviewUpgrade: () => previewUpgradeRouter(),
    ProjectOrganization: () => projectOrganizationRouter(),
    ToolingLinting: () => toolingLintingRouter(),
    CoreArchitecture: () => coreArchitectureRouter(),
    CoreCounterExample: () => coreCounterExampleRouter(),
    CoreModel: () => coreModelRouter(),
    CoreMessages: () => coreMessagesRouter(),
    CoreUpdate: () => coreUpdateRouter(),
    CoreView: () => coreViewRouter(),
    CoreCommands: () => coreCommandsRouter(),
    CoreMount: () => coreMountRouter(),
    CoreCustomElement: () => coreCustomElementRouter(),
    CoreSubscriptions: () => coreSubscriptionsRouter(),
    CoreInitAndFlags: () => coreInitAndFlagsRouter(),
    CoreDom: () => coreDomRouter(),
    CoreRender: () => coreRenderRouter(),
    CoreFile: () => coreFileRouter(),
    CoreHttp: () => coreHttpRouter(),
    CoreQuery: () => coreQueryRouter(),
    CoreCanvas: () => coreCanvasRouter(),
    CoreRuntime: () => coreRuntimeRouter(),
    CoreServerRendering: () => coreServerRenderingRouter(),
    CoreLayers: () => coreLayersRouter(),
    CoreManagedResources: () => coreManagedResourcesRouter(),
    CoreDevTools: () => coreDevToolsRouter(),
    CoreCrashView: () => coreCrashViewRouter(),
    CoreViewTransitions: () => coreViewTransitionsRouter(),
    CoreSlowWarnings: () => coreSlowWarningsRouter(),
    CoreFreezeModel: () => coreFreezeModelRouter(),
    CorePreserveScroll: () => corePreserveScrollRouter(),
    CoreBlock: () => coreBlockRouter(),
    CoreMachine: () => coreMachineRouter(),
    AsyncData: () => asyncDataRouter(),
    PatternsAntiPatterns: () => patternsAntiPatternsRouter(),
    PatternsInformingBlocks: () => patternsInformingBlocksRouter(),
    PatternsSubscriptionOrganization: () =>
      patternsSubscriptionOrganizationRouter(),
    CoreViewMemoization: () => coreViewMemoizationRouter(),
    CoreEmbedding: () => coreEmbeddingRouter(),
    UiOverview: () => uiOverviewRouter(),
    UiSelectionBlocks: () => uiSelectionBlocksRouter(),
    UiTabs: () => uiTabsRouter(),
    UiNav: () => uiNavRouter(),
    UiDisclosure: () => uiDisclosureRouter(),
    UiDialog: () => uiDialogRouter(),
    UiMenu: () => uiMenuRouter(),
    UiPopover: () => uiPopoverRouter(),
    UiListbox: () => uiListboxRouter(),
    UiRadioGroup: () => uiRadioGroupRouter(),
    UiSelect: () => uiSelectRouter(),
    UiSlider: () => uiSliderRouter(),
    UiMeter: () => uiMeterRouter(),
    UiProgress: () => uiProgressRouter(),
    UiSwitch: () => uiSwitchRouter(),
    UiButton: () => uiButtonRouter(),
    UiCalendar: () => uiCalendarRouter(),
    UiDatePicker: () => uiDatePickerRouter(),
    UiCheckbox: () => uiCheckboxRouter(),
    UiCombobox: () => uiComboboxRouter(),
    UiInput: () => uiInputRouter(),
    UiTextarea: () => uiTextareaRouter(),
    UiFieldset: () => uiFieldsetRouter(),
    UiDragAndDrop: () => uiDragAndDropRouter(),
    UiFileDrop: () => uiFileDropRouter(),
    UiHoverIntent: () => uiHoverIntentRouter(),
    UiToast: () => uiToastRouter(),
    UiTooltip: () => uiTooltipRouter(),
    UiAnimation: () => uiAnimationRouter(),
    UiAnchor: () => uiAnchorRouter(),
    UiVirtualList: () => uiVirtualListRouter(),
    AiOverview: () => aiOverviewRouter(),
    AiSkills: () => aiSkillsRouter(),
    AiMcp: () => aiMcpRouter(),
    ApiModule: ({ moduleSlug }) => apiModuleRouter({ moduleSlug }),
    ContentApi: () => contentApiRouter(),
    About: () => aboutRouter(),
    Contact: () => contactRouter(),
    Privacy: () => privacyRouter(),
    Playground: ({ exampleSlug }) => playgroundRouter({ exampleSlug }),
    Newsletter: () => newsletterRouter(),
    Blog: () => blogRouter(),
    BlogPost: ({ postSlug }) => blogPostRouter({ postSlug }),
    NotFound: ({ path }) => path,
  })

export const routeToCanonicalUrl = (
  route: typeof ApplicationRoute.Type,
): string => String.concat(SITE_URL, routeToUrlPath(route))
