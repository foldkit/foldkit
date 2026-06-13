import { Schema as S, pipe } from 'effect'
import {
  literal,
  mapTo,
  oneOf,
  parseUrlWithFallback,
  r,
  root,
  slash,
  string,
} from 'foldkit/route'

// ROUTE SCHEMAS

export const HomeRoute = r('Home')
export const ManifestoRoute = r('Manifesto')
export const WhyNoJsxRoute = r('WhyNoJsx')
export const WhatAboutSsrRoute = r('WhatAboutSsr')
export const PerformanceRoute = r('Performance')
export const ComingFromReactRoute = r('ComingFromReact')
export const ReactComparisonRoute = r('ReactComparison')
export const ElmComparisonRoute = r('ElmComparison')
export const GettingStartedRoute = r('GettingStarted')
export const RoadmapRoute = r('Roadmap')
export const RoutingAndNavigationRoute = r('RoutingAndNavigation')
export const FieldValidationRoute = r('FieldValidation')
export const TestingRoute = r('Testing')
export const TestingStoryRoute = r('TestingStory')
export const TestingSceneRoute = r('TestingScene')
export const ExamplesRoute = r('Examples')
export const ExampleDetailRoute = r('ExampleDetail', {
  exampleSlug: S.String,
})
export const TypingTerminalRoute = r('TypingTerminal')
export const PlaygroundRoute = r('Playground', {
  exampleSlug: S.String,
})
export type PlaygroundRoute = typeof PlaygroundRoute.Type
export const BestPracticesSideEffectsRoute = r('BestPracticesSideEffects')
export const BestPracticesMessagesRoute = r('BestPracticesMessages')
export const BestPracticesKeyingRoute = r('BestPracticesKeying')
export const BestPracticesImmutabilityRoute = r('BestPracticesImmutability')
export const ProjectOrganizationRoute = r('ProjectOrganization')
export const ApiModuleRoute = r('ApiModule', { moduleSlug: S.String })

export const CoreArchitectureRoute = r('CoreArchitecture')
export const CoreCounterExampleRoute = r('CoreCounterExample')
export const CoreModelRoute = r('CoreModel')
export const CoreMessagesRoute = r('CoreMessages')
export const CoreUpdateRoute = r('CoreUpdate')
export const CoreViewRoute = r('CoreView')
export const CoreCommandsRoute = r('CoreCommands')
export const CoreMountRoute = r('CoreMount')
export const CoreCustomElementRoute = r('CoreCustomElement')
export const CoreSubscriptionsRoute = r('CoreSubscriptions')
export const CoreInitAndFlagsRoute = r('CoreInitAndFlags')
export const CoreDomRoute = r('CoreDom')
export const CoreRenderRoute = r('CoreRender')
export const CoreFileRoute = r('CoreFile')
export const CoreCanvasRoute = r('CoreCanvas')
export const CoreRuntimeRoute = r('CoreRuntime')
export const CoreResourcesRoute = r('CoreResources')
export const CoreManagedResourcesRoute = r('CoreManagedResources')
export const CoreDevToolsRoute = r('CoreDevTools')
export const CoreCrashViewRoute = r('CoreCrashView')
export const CoreSlowViewRoute = r('CoreSlowView')
export const CoreFreezeModelRoute = r('CoreFreezeModel')
export const CoreViewMemoizationRoute = r('CoreViewMemoization')
export const CoreEmbeddingRoute = r('CoreEmbedding')
export const CoreSubmodelRoute = r('CoreSubmodel')

export const PatternsInformingSubmodelsRoute = r('PatternsInformingSubmodels')
export const PatternsSubscriptionOrganizationRoute = r(
  'PatternsSubscriptionOrganization',
)

export const UiOverviewRoute = r('UiOverview')
export const UiSelectionSubmodelsRoute = r('UiSelectionSubmodels')
export const UiButtonRoute = r('UiButton')
export const UiCalendarRoute = r('UiCalendar')
export const UiDatePickerRoute = r('UiDatePicker')
export const UiCheckboxRoute = r('UiCheckbox')
export const UiTabsRoute = r('UiTabs')
export const UiDisclosureRoute = r('UiDisclosure')
export const UiDialogRoute = r('UiDialog')
export const UiMenuRoute = r('UiMenu')
export const UiPopoverRoute = r('UiPopover')
export const UiListboxRoute = r('UiListbox')
export const UiRadioGroupRoute = r('UiRadioGroup')
export const UiSelectRoute = r('UiSelect')
export const UiSliderRoute = r('UiSlider')
export const UiSwitchRoute = r('UiSwitch')
export const UiComboboxRoute = r('UiCombobox')
export const UiInputRoute = r('UiInput')
export const UiTextareaRoute = r('UiTextarea')
export const UiFieldsetRoute = r('UiFieldset')
export const UiDragAndDropRoute = r('UiDragAndDrop')
export const UiFileDropRoute = r('UiFileDrop')
export const UiToastRoute = r('UiToast')
export const UiTooltipRoute = r('UiTooltip')
export const UiAnimationRoute = r('UiAnimation')
export const UiVirtualListRoute = r('UiVirtualList')

export const AiOverviewRoute = r('AiOverview')
export const AiSkillsRoute = r('AiSkills')
export const AiMcpRoute = r('AiMcp')

export const NewsletterRoute = r('Newsletter')

export const NotFoundRoute = r('NotFound', { path: S.String })

export const DocsRoute = S.Union([
  ManifestoRoute,
  WhyNoJsxRoute,
  WhatAboutSsrRoute,
  PerformanceRoute,
  ComingFromReactRoute,
  ReactComparisonRoute,
  ElmComparisonRoute,
  GettingStartedRoute,
  RoadmapRoute,
  RoutingAndNavigationRoute,
  FieldValidationRoute,
  TestingRoute,
  TestingStoryRoute,
  TestingSceneRoute,
  ExamplesRoute,
  ExampleDetailRoute,
  TypingTerminalRoute,
  BestPracticesSideEffectsRoute,
  BestPracticesMessagesRoute,
  BestPracticesKeyingRoute,
  BestPracticesImmutabilityRoute,
  ProjectOrganizationRoute,
  ApiModuleRoute,
  CoreArchitectureRoute,
  CoreCounterExampleRoute,
  CoreModelRoute,
  CoreMessagesRoute,
  CoreUpdateRoute,
  CoreViewRoute,
  CoreCommandsRoute,
  CoreMountRoute,
  CoreCustomElementRoute,
  CoreSubscriptionsRoute,
  CoreInitAndFlagsRoute,
  CoreDomRoute,
  CoreRenderRoute,
  CoreFileRoute,
  CoreCanvasRoute,
  CoreRuntimeRoute,
  CoreResourcesRoute,
  CoreManagedResourcesRoute,
  CoreDevToolsRoute,
  CoreCrashViewRoute,
  CoreSlowViewRoute,
  CoreFreezeModelRoute,
  CoreViewMemoizationRoute,
  CoreEmbeddingRoute,
  CoreSubmodelRoute,
  PatternsInformingSubmodelsRoute,
  PatternsSubscriptionOrganizationRoute,
  UiOverviewRoute,
  UiSelectionSubmodelsRoute,
  UiButtonRoute,
  UiCalendarRoute,
  UiDatePickerRoute,
  UiCheckboxRoute,
  UiTabsRoute,
  UiDisclosureRoute,
  UiDialogRoute,
  UiMenuRoute,
  UiPopoverRoute,
  UiListboxRoute,
  UiRadioGroupRoute,
  UiSelectRoute,
  UiSliderRoute,
  UiSwitchRoute,
  UiComboboxRoute,
  UiInputRoute,
  UiTextareaRoute,
  UiFieldsetRoute,
  UiDragAndDropRoute,
  UiFileDropRoute,
  UiToastRoute,
  UiTooltipRoute,
  UiAnimationRoute,
  UiVirtualListRoute,
  AiOverviewRoute,
  AiSkillsRoute,
  AiMcpRoute,
  NotFoundRoute,
])
export type DocsRoute = typeof DocsRoute.Type

export const AppRoute = S.Union([
  HomeRoute,
  NewsletterRoute,
  PlaygroundRoute,
  DocsRoute,
])
export type AppRoute = typeof AppRoute.Type

export const isPlaygroundRoute = (route: AppRoute): route is PlaygroundRoute =>
  route._tag === 'Playground'

// ROUTERS

const page = <T>(slug: string, route: { make: (input: {}) => T }) =>
  pipe(literal(slug), mapTo(route))

const section =
  (sectionSlug: string) =>
  <T>(pageSlug: string, route: { make: (input: {}) => T }) =>
    pipe(literal(sectionSlug), slash(literal(pageSlug)), mapTo(route))

const getStarted = section('get-started')
const faq = section('faq')
const react = section('react')
const elm = section('elm')
const core = section('core')
const patterns = section('patterns')
const testing = section('testing')
const bestPractices = section('best-practices')
const ui = section('ui')
const ai = section('ai')

export const homeRouter = pipe(root, mapTo(HomeRoute))

export const manifestoRouter = getStarted('manifesto', ManifestoRoute)
export const gettingStartedRouter = getStarted(
  'getting-started',
  GettingStartedRoute,
)

export const roadmapRouter = page('roadmap', RoadmapRoute)

export const whyNoJsxRouter = faq('why-no-jsx', WhyNoJsxRoute)
export const whatAboutSsrRouter = faq('what-about-ssr', WhatAboutSsrRoute)
export const performanceRouter = faq('performance', PerformanceRoute)

export const comingFromReactRouter = react(
  'coming-from-react',
  ComingFromReactRoute,
)
export const reactComparisonRouter = react(
  'foldkit-vs-react-side-by-side',
  ReactComparisonRoute,
)
export const elmComparisonRouter = elm(
  'foldkit-vs-elm-side-by-side',
  ElmComparisonRoute,
)

export const routingAndNavigationRouter = core(
  'routing-and-navigation',
  RoutingAndNavigationRoute,
)
export const fieldValidationRouter = core(
  'field-validation',
  FieldValidationRoute,
)

export const testingRouter = page('testing', TestingRoute)
export const testingStoryRouter = testing('story', TestingStoryRoute)
export const testingSceneRouter = testing('scene', TestingSceneRoute)

export const examplesRouter = page('example-apps', ExamplesRoute)
export const exampleDetailRouter = pipe(
  literal('example-apps'),
  slash(string('exampleSlug')),
  mapTo(ExampleDetailRoute),
)
export const typingTerminalRouter = pipe(
  literal('example-apps'),
  slash(literal('typing-terminal')),
  mapTo(TypingTerminalRoute),
)

export const playgroundRouter = pipe(
  literal('playground'),
  slash(string('exampleSlug')),
  mapTo(PlaygroundRoute),
)

export const bestPracticesSideEffectsRouter = bestPractices(
  'side-effects-and-purity',
  BestPracticesSideEffectsRoute,
)
export const bestPracticesMessagesRouter = bestPractices(
  'messages',
  BestPracticesMessagesRoute,
)
export const bestPracticesKeyingRouter = bestPractices(
  'keying',
  BestPracticesKeyingRoute,
)
export const bestPracticesImmutabilityRouter = bestPractices(
  'immutability',
  BestPracticesImmutabilityRoute,
)

export const projectOrganizationRouter = patterns(
  'project-organization',
  ProjectOrganizationRoute,
)

export const apiModuleRouter = pipe(
  literal('api-reference'),
  slash(string('moduleSlug')),
  mapTo(ApiModuleRoute),
)

export const coreArchitectureRouter = core(
  'architecture',
  CoreArchitectureRoute,
)
export const coreCounterExampleRouter = core(
  'counter-example',
  CoreCounterExampleRoute,
)
export const coreModelRouter = core('model', CoreModelRoute)
export const coreMessagesRouter = core('messages', CoreMessagesRoute)
export const coreUpdateRouter = core('update', CoreUpdateRoute)
export const coreViewRouter = core('view', CoreViewRoute)
export const coreCommandsRouter = core('commands', CoreCommandsRoute)
export const coreMountRouter = core('mount', CoreMountRoute)
export const coreCustomElementRouter = core(
  'custom-element',
  CoreCustomElementRoute,
)
export const coreSubscriptionsRouter = core(
  'subscriptions',
  CoreSubscriptionsRoute,
)
export const coreInitAndFlagsRouter = core(
  'init-and-flags',
  CoreInitAndFlagsRoute,
)
export const coreDomRouter = core('dom', CoreDomRoute)
export const coreRenderRouter = core('render', CoreRenderRoute)
export const coreFileRouter = core('file', CoreFileRoute)
export const coreCanvasRouter = core('canvas', CoreCanvasRoute)
export const coreRuntimeRouter = core('runtime', CoreRuntimeRoute)
export const coreResourcesRouter = core('resources', CoreResourcesRoute)
export const coreManagedResourcesRouter = core(
  'managed-resources',
  CoreManagedResourcesRoute,
)
export const coreDevToolsRouter = core('devtools', CoreDevToolsRoute)
export const coreCrashViewRouter = core('crash-view', CoreCrashViewRoute)
export const coreSlowViewRouter = core('slow-view', CoreSlowViewRoute)
export const coreFreezeModelRouter = core('freeze-model', CoreFreezeModelRoute)
export const coreViewMemoizationRouter = core(
  'view-memoization',
  CoreViewMemoizationRoute,
)
export const coreEmbeddingRouter = core('embedding', CoreEmbeddingRoute)
export const coreSubmodelRouter = core('submodel', CoreSubmodelRoute)

export const patternsInformingSubmodelsRouter = patterns(
  'informing-submodels',
  PatternsInformingSubmodelsRoute,
)
export const patternsSubscriptionOrganizationRouter = patterns(
  'subscription-organization',
  PatternsSubscriptionOrganizationRoute,
)

export const uiOverviewRouter = ui('overview', UiOverviewRoute)
export const uiSelectionSubmodelsRouter = ui(
  'selection-submodels',
  UiSelectionSubmodelsRoute,
)
export const uiButtonRouter = ui('button', UiButtonRoute)
export const uiCalendarRouter = ui('calendar', UiCalendarRoute)
export const uiDatePickerRouter = ui('date-picker', UiDatePickerRoute)
export const uiCheckboxRouter = ui('checkbox', UiCheckboxRoute)
export const uiTabsRouter = ui('tabs', UiTabsRoute)
export const uiDisclosureRouter = ui('disclosure', UiDisclosureRoute)
export const uiDialogRouter = ui('dialog', UiDialogRoute)
export const uiMenuRouter = ui('menu', UiMenuRoute)
export const uiPopoverRouter = ui('popover', UiPopoverRoute)
export const uiListboxRouter = ui('listbox', UiListboxRoute)
export const uiRadioGroupRouter = ui('radio-group', UiRadioGroupRoute)
export const uiSelectRouter = ui('select', UiSelectRoute)
export const uiSliderRouter = ui('slider', UiSliderRoute)
export const uiSwitchRouter = ui('switch', UiSwitchRoute)
export const uiComboboxRouter = ui('combobox', UiComboboxRoute)
export const uiInputRouter = ui('input', UiInputRoute)
export const uiTextareaRouter = ui('textarea', UiTextareaRoute)
export const uiFieldsetRouter = ui('fieldset', UiFieldsetRoute)
export const uiDragAndDropRouter = ui('drag-and-drop', UiDragAndDropRoute)
export const uiFileDropRouter = ui('file-drop', UiFileDropRoute)
export const uiToastRouter = ui('toast', UiToastRoute)
export const uiTooltipRouter = ui('tooltip', UiTooltipRoute)
export const uiAnimationRouter = ui('animation', UiAnimationRoute)
export const uiVirtualListRouter = ui('virtual-list', UiVirtualListRoute)

export const aiOverviewRouter = ai('overview', AiOverviewRoute)
export const aiSkillsRouter = ai('skills', AiSkillsRoute)
export const aiMcpRouter = ai('mcp', AiMcpRoute)

// PARSER

const getStartedParser = oneOf(manifestoRouter, gettingStartedRouter)

const faqParser = oneOf(whyNoJsxRouter, whatAboutSsrRouter, performanceRouter)

const reactParser = oneOf(comingFromReactRouter, reactComparisonRouter)

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
  coreCanvasRouter,
  coreRuntimeRouter,
  coreResourcesRouter,
  coreManagedResourcesRouter,
  coreDevToolsRouter,
  coreCrashViewRouter,
  coreSlowViewRouter,
  coreFreezeModelRouter,
  coreViewMemoizationRouter,
  coreEmbeddingRouter,
  coreSubmodelRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
)

const patternsParser = oneOf(
  patternsInformingSubmodelsRouter,
  patternsSubscriptionOrganizationRouter,
  projectOrganizationRouter,
)

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
  uiToastRouter,
  uiTooltipRouter,
  uiAnimationRouter,
  uiVirtualListRouter,
)

const aiParser = oneOf(aiOverviewRouter, aiSkillsRouter, aiMcpRouter)

const docsParser = oneOf(
  getStartedParser,
  roadmapRouter,
  faqParser,
  reactParser,
  elmParser,
  coreParser,
  patternsParser,
  bestPracticesParser,
  testingParser,
  examplesParser,
  uiParser,
  aiParser,
)

export const newsletterRouter = page('newsletter', NewsletterRoute)

export const routeParser = oneOf(
  docsParser,
  apiModuleRouter,
  newsletterRouter,
  playgroundRouter,
  homeRouter,
)

export const urlToAppRoute = parseUrlWithFallback(routeParser, NotFoundRoute)

export const isLandingHeaderAlwaysVisible = (route: AppRoute) =>
  route._tag === 'Newsletter'
