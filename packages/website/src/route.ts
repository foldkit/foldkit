import { Schema, pipe } from 'effect'
import {
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

export const AppRoute = defineRouteUnion({
  Home: {},
  Manifesto: {},
  WhyNoJsx: {},
  Performance: {},
  ComingFromReact: {},
  ComingFromTanStackQuery: {},
  ReactComparison: {},
  EffectAtomComparison: {},
  ElmComparison: {},
  GettingStarted: {},
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
  CoreCanvas: {},
  CoreRuntime: {},
  CoreServerRendering: {},
  CoreResources: {},
  CoreManagedResources: {},
  CoreCrashView: {},
  CoreViewTransitions: {},
  CoreSlowWarnings: {},
  CoreFreezeModel: {},
  CorePreserveScroll: {},
  CoreViewMemoization: {},
  CoreEmbedding: {},
  DevToolsOverview: {},
  DevToolsReRenderOutlines: {},
  CoreSubmodel: {},
  AsyncData: {},
  PatternsInformingSubmodels: {},
  PatternsSubscriptionOrganization: {},
  UiOverview: {},
  UiSelectionSubmodels: {},
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
export type AppRoute = typeof AppRoute.Type

export const DocsRoute = AppRoute.subset([
  'Manifesto',
  'WhyNoJsx',
  'Performance',
  'ComingFromReact',
  'ComingFromTanStackQuery',
  'ReactComparison',
  'EffectAtomComparison',
  'ElmComparison',
  'GettingStarted',
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
  'CoreCanvas',
  'CoreRuntime',
  'CoreServerRendering',
  'CoreResources',
  'CoreManagedResources',
  'CoreCrashView',
  'CoreViewTransitions',
  'CoreSlowWarnings',
  'CoreFreezeModel',
  'CorePreserveScroll',
  'CoreViewMemoization',
  'CoreEmbedding',
  'DevToolsOverview',
  'DevToolsReRenderOutlines',
  'CoreSubmodel',
  'AsyncData',
  'PatternsInformingSubmodels',
  'PatternsSubscriptionOrganization',
  'UiOverview',
  'UiSelectionSubmodels',
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
export type DocsRoute = typeof DocsRoute.Type

export type BlogRoute = typeof AppRoute.Blog.Type
export type BlogPostRoute = typeof AppRoute.BlogPost.Type
export type PlaygroundRoute = typeof AppRoute.Playground.Type

export const isPlaygroundRoute = AppRoute.isAnyOf(['Playground'])

export const isBlogRoute = AppRoute.isAnyOf(['Blog', 'BlogPost'])

const isDocsUnionRoute = Schema.is(DocsRoute)

/**
 * Whether a route belongs to the documentation section, which is what the
 * header's `Docs` link highlights on. Derived from `DocsRoute` so a new
 * top-level route cannot silently join the section. `NotFound` is a member of
 * the union so 404s render in the docs shell, but it belongs to no section.
 */
export const isDocsSectionRoute = (route: AppRoute): boolean =>
  isDocsUnionRoute(route) && route._tag !== 'NotFound'

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
const devtools = section('devtools')

export const homeRouter = pipe(root, mapTo(AppRoute.Home))

export const manifestoRouter = getStarted('why-foldkit', AppRoute.Manifesto)
export const gettingStartedRouter = getStarted(
  'getting-started',
  AppRoute.GettingStarted,
)

export const roadmapRouter = staticPage('roadmap', AppRoute.Roadmap)

export const whyNoJsxRouter = faq('why-no-jsx', AppRoute.WhyNoJsx)
export const performanceRouter = faq('performance', AppRoute.Performance)

export const comingFromReactRouter = react(
  'coming-from-react',
  AppRoute.ComingFromReact,
)
export const comingFromTanStackQueryRouter = react(
  'coming-from-tanstack-query',
  AppRoute.ComingFromTanStackQuery,
)
export const reactComparisonRouter = react(
  'foldkit-vs-react-side-by-side',
  AppRoute.ReactComparison,
)
export const effectAtomComparisonRouter = react(
  'foldkit-vs-react-effect-atom',
  AppRoute.EffectAtomComparison,
)
export const elmComparisonRouter = elm(
  'foldkit-vs-elm-side-by-side',
  AppRoute.ElmComparison,
)

export const routingAndNavigationRouter = core(
  'routing-and-navigation',
  AppRoute.RoutingAndNavigation,
)
export const fieldValidationRouter = core(
  'field-validation',
  AppRoute.FieldValidation,
)

export const testingRouter = staticPage('testing', AppRoute.Testing)
export const testingStoryRouter = testing('story', AppRoute.TestingStory)
export const testingSceneRouter = testing('scene', AppRoute.TestingScene)

export const examplesRouter = staticPage('example-apps', AppRoute.Examples)
export const exampleDetailRouter = pipe(
  literal('example-apps'),
  slash(string('exampleSlug')),
  mapTo(AppRoute.ExampleDetail),
)
export const typingTerminalRouter = pipe(
  literal('example-apps'),
  slash(literal('typing-terminal')),
  mapTo(AppRoute.TypingTerminal),
)

export const playgroundRouter = pipe(
  literal('playground'),
  slash(string('exampleSlug')),
  mapTo(AppRoute.Playground),
)

export const bestPracticesSideEffectsRouter = bestPractices(
  'side-effects-and-purity',
  AppRoute.BestPracticesSideEffects,
)
export const bestPracticesMessagesRouter = bestPractices(
  'messages',
  AppRoute.BestPracticesMessages,
)
export const bestPracticesKeyingRouter = bestPractices(
  'keying',
  AppRoute.BestPracticesKeying,
)
export const bestPracticesImmutabilityRouter = bestPractices(
  'immutability',
  AppRoute.BestPracticesImmutability,
)

export const projectOrganizationRouter = patterns(
  'project-organization',
  AppRoute.ProjectOrganization,
)
export const toolingLintingRouter = tooling(
  'oxlint-plugin',
  AppRoute.ToolingLinting,
)

export const apiModuleRouter = pipe(
  literal('api-reference'),
  slash(string('moduleSlug')),
  mapTo(AppRoute.ApiModule),
)

export const coreArchitectureRouter = core(
  'architecture',
  AppRoute.CoreArchitecture,
)
export const coreCounterExampleRouter = core(
  'counter-example',
  AppRoute.CoreCounterExample,
)
export const coreModelRouter = core('model', AppRoute.CoreModel)
export const coreMessagesRouter = core('messages', AppRoute.CoreMessages)
export const coreUpdateRouter = core('update', AppRoute.CoreUpdate)
export const coreViewRouter = core('view', AppRoute.CoreView)
export const coreCommandsRouter = core('commands', AppRoute.CoreCommands)
export const coreMountRouter = core('mount', AppRoute.CoreMount)
export const coreCustomElementRouter = core(
  'custom-element',
  AppRoute.CoreCustomElement,
)
export const coreSubscriptionsRouter = core(
  'subscriptions',
  AppRoute.CoreSubscriptions,
)
export const coreInitAndFlagsRouter = core(
  'init-and-flags',
  AppRoute.CoreInitAndFlags,
)
export const coreDomRouter = core('dom', AppRoute.CoreDom)
export const coreRenderRouter = core('render', AppRoute.CoreRender)
export const coreFileRouter = core('file', AppRoute.CoreFile)
export const coreHttpRouter = core('http', AppRoute.CoreHttp)
export const coreCanvasRouter = core('canvas', AppRoute.CoreCanvas)
export const coreRuntimeRouter = core('runtime', AppRoute.CoreRuntime)
export const coreServerRenderingRouter = core(
  'server-rendering',
  AppRoute.CoreServerRendering,
)
export const coreResourcesRouter = core('resources', AppRoute.CoreResources)
export const coreManagedResourcesRouter = core(
  'managed-resources',
  AppRoute.CoreManagedResources,
)
export const coreCrashViewRouter = core('crash-view', AppRoute.CoreCrashView)
export const coreViewTransitionsRouter = core(
  'view-transitions',
  AppRoute.CoreViewTransitions,
)
export const coreSlowWarningsRouter = core(
  'slow-warnings',
  AppRoute.CoreSlowWarnings,
)
export const coreFreezeModelRouter = core(
  'freeze-model',
  AppRoute.CoreFreezeModel,
)
export const corePreserveScrollRouter = core(
  'preserve-scroll',
  AppRoute.CorePreserveScroll,
)
export const coreViewMemoizationRouter = core(
  'view-memoization',
  AppRoute.CoreViewMemoization,
)
export const coreEmbeddingRouter = core('embedding', AppRoute.CoreEmbedding)
export const devToolsOverviewRouter = pipe(
  literal('devtools'),
  mapTo(AppRoute.DevToolsOverview),
)
export const devToolsReRenderOutlinesRouter = devtools(
  're-render-outlines',
  AppRoute.DevToolsReRenderOutlines,
)
export const coreSubmodelRouter = core('submodel', AppRoute.CoreSubmodel)
export const asyncDataRouter = core('async-data', AppRoute.AsyncData)

export const patternsInformingSubmodelsRouter = patterns(
  'informing-submodels',
  AppRoute.PatternsInformingSubmodels,
)
export const patternsSubscriptionOrganizationRouter = patterns(
  'subscription-organization',
  AppRoute.PatternsSubscriptionOrganization,
)
export const uiOverviewRouter = ui('overview', AppRoute.UiOverview)
export const uiSelectionSubmodelsRouter = ui(
  'selection-submodels',
  AppRoute.UiSelectionSubmodels,
)
export const uiButtonRouter = ui('button', AppRoute.UiButton)
export const uiCalendarRouter = ui('calendar', AppRoute.UiCalendar)
export const uiDatePickerRouter = ui('date-picker', AppRoute.UiDatePicker)
export const uiCheckboxRouter = ui('checkbox', AppRoute.UiCheckbox)
export const uiTabsRouter = ui('tabs', AppRoute.UiTabs)
export const uiNavRouter = ui('nav', AppRoute.UiNav)
export const uiDisclosureRouter = ui('disclosure', AppRoute.UiDisclosure)
export const uiDialogRouter = ui('dialog', AppRoute.UiDialog)
export const uiMenuRouter = ui('menu', AppRoute.UiMenu)
export const uiPopoverRouter = ui('popover', AppRoute.UiPopover)
export const uiListboxRouter = ui('listbox', AppRoute.UiListbox)
export const uiRadioGroupRouter = ui('radio-group', AppRoute.UiRadioGroup)
export const uiSelectRouter = ui('select', AppRoute.UiSelect)
export const uiSliderRouter = ui('slider', AppRoute.UiSlider)
export const uiSwitchRouter = ui('switch', AppRoute.UiSwitch)
export const uiComboboxRouter = ui('combobox', AppRoute.UiCombobox)
export const uiInputRouter = ui('input', AppRoute.UiInput)
export const uiTextareaRouter = ui('textarea', AppRoute.UiTextarea)
export const uiFieldsetRouter = ui('fieldset', AppRoute.UiFieldset)
export const uiDragAndDropRouter = ui('drag-and-drop', AppRoute.UiDragAndDrop)
export const uiFileDropRouter = ui('file-drop', AppRoute.UiFileDrop)
export const uiHoverIntentRouter = ui('hover-intent', AppRoute.UiHoverIntent)
export const uiToastRouter = ui('toast', AppRoute.UiToast)
export const uiTooltipRouter = ui('tooltip', AppRoute.UiTooltip)
export const uiAnimationRouter = ui('animation', AppRoute.UiAnimation)
export const uiAnchorRouter = ui('anchor', AppRoute.UiAnchor)
export const uiVirtualListRouter = ui('virtual-list', AppRoute.UiVirtualList)

export const aboutRouter = staticPage('about', AppRoute.About)
export const contactRouter = staticPage('contact', AppRoute.Contact)
export const privacyRouter = staticPage('privacy', AppRoute.Privacy)
export const contentApiRouter = staticPage('api', AppRoute.ContentApi)

export const aiOverviewRouter = ai('overview', AppRoute.AiOverview)
export const aiSkillsRouter = ai('skills', AppRoute.AiSkills)
export const aiMcpRouter = ai('mcp', AppRoute.AiMcp)

// PARSER

const getStartedParser = oneOf(manifestoRouter, gettingStartedRouter)

const faqParser = oneOf(whyNoJsxRouter, performanceRouter)

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
  coreCanvasRouter,
  coreRuntimeRouter,
  coreServerRenderingRouter,
  coreResourcesRouter,
  coreManagedResourcesRouter,
  coreCrashViewRouter,
  coreViewTransitionsRouter,
  coreSlowWarningsRouter,
  coreFreezeModelRouter,
  corePreserveScrollRouter,
  coreViewMemoizationRouter,
  coreEmbeddingRouter,
  coreSubmodelRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
  asyncDataRouter,
)

const patternsParser = oneOf(
  patternsInformingSubmodelsRouter,
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
  uiSelectionSubmodelsRouter,
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

const devtoolsParser = oneOf(
  devToolsReRenderOutlinesRouter,
  devToolsOverviewRouter,
)

const aiParser = oneOf(aiOverviewRouter, aiSkillsRouter, aiMcpRouter)

const siteParser = oneOf(
  aboutRouter,
  contactRouter,
  privacyRouter,
  contentApiRouter,
)

const docsParser = oneOf(
  getStartedParser,
  roadmapRouter,
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
  devtoolsParser,
  aiParser,
  siteParser,
)

export const newsletterRouter = staticPage('newsletter', AppRoute.Newsletter)

export const blogRouter = staticPage('blog', AppRoute.Blog)

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
  mapTo(AppRoute.BlogPost),
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

export const urlToAppRoute = parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
