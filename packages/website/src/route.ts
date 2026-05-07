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
export const ComingFromReactRoute = r('ComingFromReact')
export const ReactComparisonRoute = r('ReactComparison')
export const GettingStartedRoute = r('GettingStarted')
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
export const CoreSubscriptionsRoute = r('CoreSubscriptions')
export const CoreInitAndFlagsRoute = r('CoreInitAndFlags')
export const CoreDomRoute = r('CoreDom')
export const CoreRenderRoute = r('CoreRender')
export const CoreFileRoute = r('CoreFile')
export const CoreRunningYourAppRoute = r('CoreRunningYourApp')
export const CoreResourcesRoute = r('CoreResources')
export const CoreManagedResourcesRoute = r('CoreManagedResources')
export const CoreDevToolsRoute = r('CoreDevTools')
export const CoreCrashViewRoute = r('CoreCrashView')
export const CoreSlowViewRoute = r('CoreSlowView')
export const CoreFreezeModelRoute = r('CoreFreezeModel')
export const CoreViewMemoizationRoute = r('CoreViewMemoization')

export const PatternsSubmodelsRoute = r('PatternsSubmodels')
export const PatternsOutMessageRoute = r('PatternsOutMessage')

export const UiOverviewRoute = r('UiOverview')
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
  ComingFromReactRoute,
  ReactComparisonRoute,
  GettingStartedRoute,
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
  CoreSubscriptionsRoute,
  CoreInitAndFlagsRoute,
  CoreDomRoute,
  CoreRenderRoute,
  CoreFileRoute,
  CoreRunningYourAppRoute,
  CoreResourcesRoute,
  CoreManagedResourcesRoute,
  CoreDevToolsRoute,
  CoreCrashViewRoute,
  CoreSlowViewRoute,
  CoreFreezeModelRoute,
  CoreViewMemoizationRoute,
  PatternsSubmodelsRoute,
  PatternsOutMessageRoute,
  UiOverviewRoute,
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

// ROUTERS

export const homeRouter = pipe(root, mapTo(HomeRoute))
export const manifestoRouter = pipe(literal('manifesto'), mapTo(ManifestoRoute))
export const whyNoJsxRouter = pipe(literal('why-no-jsx'), mapTo(WhyNoJsxRoute))
export const comingFromReactRouter = pipe(
  literal('coming-from-react'),
  mapTo(ComingFromReactRoute),
)
export const reactComparisonRouter = pipe(
  literal('foldkit-vs-react-side-by-side'),
  mapTo(ReactComparisonRoute),
)
export const gettingStartedRouter = pipe(
  literal('getting-started'),
  mapTo(GettingStartedRoute),
)
export const routingAndNavigationRouter = pipe(
  literal('routing-and-navigation'),
  mapTo(RoutingAndNavigationRoute),
)
export const fieldValidationRouter = pipe(
  literal('field-validation'),
  mapTo(FieldValidationRoute),
)
export const testingRouter = pipe(literal('testing'), mapTo(TestingRoute))
export const testingStoryRouter = pipe(
  literal('testing'),
  slash(literal('story')),
  mapTo(TestingStoryRoute),
)
export const testingSceneRouter = pipe(
  literal('testing'),
  slash(literal('scene')),
  mapTo(TestingSceneRoute),
)
export const examplesRouter = pipe(
  literal('example-apps'),
  mapTo(ExamplesRoute),
)
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
export const bestPracticesSideEffectsRouter = pipe(
  literal('best-practices'),
  slash(literal('side-effects-and-purity')),
  mapTo(BestPracticesSideEffectsRoute),
)
export const bestPracticesMessagesRouter = pipe(
  literal('best-practices'),
  slash(literal('messages')),
  mapTo(BestPracticesMessagesRoute),
)
export const bestPracticesKeyingRouter = pipe(
  literal('best-practices'),
  slash(literal('keying')),
  mapTo(BestPracticesKeyingRoute),
)
export const bestPracticesImmutabilityRouter = pipe(
  literal('best-practices'),
  slash(literal('immutability')),
  mapTo(BestPracticesImmutabilityRoute),
)
export const projectOrganizationRouter = pipe(
  literal('project-organization'),
  mapTo(ProjectOrganizationRoute),
)
export const apiModuleRouter = pipe(
  literal('api-reference'),
  slash(string('moduleSlug')),
  mapTo(ApiModuleRoute),
)

export const coreArchitectureRouter = pipe(
  literal('core'),
  slash(literal('architecture')),
  mapTo(CoreArchitectureRoute),
)
export const coreCounterExampleRouter = pipe(
  literal('core'),
  slash(literal('counter-example')),
  mapTo(CoreCounterExampleRoute),
)
export const coreModelRouter = pipe(
  literal('core'),
  slash(literal('model')),
  mapTo(CoreModelRoute),
)
export const coreMessagesRouter = pipe(
  literal('core'),
  slash(literal('messages')),
  mapTo(CoreMessagesRoute),
)
export const coreUpdateRouter = pipe(
  literal('core'),
  slash(literal('update')),
  mapTo(CoreUpdateRoute),
)
export const coreViewRouter = pipe(
  literal('core'),
  slash(literal('view')),
  mapTo(CoreViewRoute),
)
export const coreCommandsRouter = pipe(
  literal('core'),
  slash(literal('commands')),
  mapTo(CoreCommandsRoute),
)
export const coreMountRouter = pipe(
  literal('core'),
  slash(literal('mount')),
  mapTo(CoreMountRoute),
)
export const coreSubscriptionsRouter = pipe(
  literal('core'),
  slash(literal('subscriptions')),
  mapTo(CoreSubscriptionsRoute),
)
export const coreInitAndFlagsRouter = pipe(
  literal('core'),
  slash(literal('init-and-flags')),
  mapTo(CoreInitAndFlagsRoute),
)
export const coreDomRouter = pipe(
  literal('core'),
  slash(literal('dom')),
  mapTo(CoreDomRoute),
)
export const coreRenderRouter = pipe(
  literal('core'),
  slash(literal('render')),
  mapTo(CoreRenderRoute),
)
export const coreFileRouter = pipe(
  literal('core'),
  slash(literal('file')),
  mapTo(CoreFileRoute),
)
export const coreRunningYourAppRouter = pipe(
  literal('core'),
  slash(literal('running-your-app')),
  mapTo(CoreRunningYourAppRoute),
)
export const coreResourcesRouter = pipe(
  literal('core'),
  slash(literal('resources')),
  mapTo(CoreResourcesRoute),
)
export const coreManagedResourcesRouter = pipe(
  literal('core'),
  slash(literal('managed-resources')),
  mapTo(CoreManagedResourcesRoute),
)
export const coreDevToolsRouter = pipe(
  literal('core'),
  slash(literal('devtools')),
  mapTo(CoreDevToolsRoute),
)
export const coreCrashViewRouter = pipe(
  literal('core'),
  slash(literal('crash-view')),
  mapTo(CoreCrashViewRoute),
)
export const coreSlowViewRouter = pipe(
  literal('core'),
  slash(literal('slow-view')),
  mapTo(CoreSlowViewRoute),
)
export const coreFreezeModelRouter = pipe(
  literal('core'),
  slash(literal('freeze-model')),
  mapTo(CoreFreezeModelRoute),
)
export const coreViewMemoizationRouter = pipe(
  literal('core'),
  slash(literal('view-memoization')),
  mapTo(CoreViewMemoizationRoute),
)

export const patternsSubmodelsRouter = pipe(
  literal('patterns'),
  slash(literal('submodels')),
  mapTo(PatternsSubmodelsRoute),
)
export const patternsOutMessageRouter = pipe(
  literal('patterns'),
  slash(literal('out-message')),
  mapTo(PatternsOutMessageRoute),
)

export const uiOverviewRouter = pipe(
  literal('ui'),
  slash(literal('overview')),
  mapTo(UiOverviewRoute),
)
export const uiButtonRouter = pipe(
  literal('ui'),
  slash(literal('button')),
  mapTo(UiButtonRoute),
)
export const uiCalendarRouter = pipe(
  literal('ui'),
  slash(literal('calendar')),
  mapTo(UiCalendarRoute),
)
export const uiDatePickerRouter = pipe(
  literal('ui'),
  slash(literal('date-picker')),
  mapTo(UiDatePickerRoute),
)
export const uiCheckboxRouter = pipe(
  literal('ui'),
  slash(literal('checkbox')),
  mapTo(UiCheckboxRoute),
)
export const uiTabsRouter = pipe(
  literal('ui'),
  slash(literal('tabs')),
  mapTo(UiTabsRoute),
)
export const uiDisclosureRouter = pipe(
  literal('ui'),
  slash(literal('disclosure')),
  mapTo(UiDisclosureRoute),
)
export const uiDialogRouter = pipe(
  literal('ui'),
  slash(literal('dialog')),
  mapTo(UiDialogRoute),
)
export const uiMenuRouter = pipe(
  literal('ui'),
  slash(literal('menu')),
  mapTo(UiMenuRoute),
)
export const uiPopoverRouter = pipe(
  literal('ui'),
  slash(literal('popover')),
  mapTo(UiPopoverRoute),
)
export const uiListboxRouter = pipe(
  literal('ui'),
  slash(literal('listbox')),
  mapTo(UiListboxRoute),
)
export const uiRadioGroupRouter = pipe(
  literal('ui'),
  slash(literal('radio-group')),
  mapTo(UiRadioGroupRoute),
)
export const uiSelectRouter = pipe(
  literal('ui'),
  slash(literal('select')),
  mapTo(UiSelectRoute),
)
export const uiSliderRouter = pipe(
  literal('ui'),
  slash(literal('slider')),
  mapTo(UiSliderRoute),
)
export const uiSwitchRouter = pipe(
  literal('ui'),
  slash(literal('switch')),
  mapTo(UiSwitchRoute),
)
export const uiComboboxRouter = pipe(
  literal('ui'),
  slash(literal('combobox')),
  mapTo(UiComboboxRoute),
)
export const uiInputRouter = pipe(
  literal('ui'),
  slash(literal('input')),
  mapTo(UiInputRoute),
)
export const uiTextareaRouter = pipe(
  literal('ui'),
  slash(literal('textarea')),
  mapTo(UiTextareaRoute),
)
export const uiFieldsetRouter = pipe(
  literal('ui'),
  slash(literal('fieldset')),
  mapTo(UiFieldsetRoute),
)
export const uiDragAndDropRouter = pipe(
  literal('ui'),
  slash(literal('drag-and-drop')),
  mapTo(UiDragAndDropRoute),
)
export const uiFileDropRouter = pipe(
  literal('ui'),
  slash(literal('file-drop')),
  mapTo(UiFileDropRoute),
)
export const uiToastRouter = pipe(
  literal('ui'),
  slash(literal('toast')),
  mapTo(UiToastRoute),
)
export const uiTooltipRouter = pipe(
  literal('ui'),
  slash(literal('tooltip')),
  mapTo(UiTooltipRoute),
)
export const uiAnimationRouter = pipe(
  literal('ui'),
  slash(literal('animation')),
  mapTo(UiAnimationRoute),
)
export const uiVirtualListRouter = pipe(
  literal('ui'),
  slash(literal('virtual-list')),
  mapTo(UiVirtualListRoute),
)

export const aiOverviewRouter = pipe(
  literal('ai'),
  slash(literal('overview')),
  mapTo(AiOverviewRoute),
)
export const aiSkillsRouter = pipe(
  literal('ai'),
  slash(literal('skills')),
  mapTo(AiSkillsRoute),
)
export const aiMcpRouter = pipe(
  literal('ai'),
  slash(literal('mcp')),
  mapTo(AiMcpRoute),
)

// PARSER

const topLevelDocsParser = oneOf(
  manifestoRouter,
  whyNoJsxRouter,
  comingFromReactRouter,
  reactComparisonRouter,
  gettingStartedRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
  testingStoryRouter,
  testingSceneRouter,
  testingRouter,
  typingTerminalRouter,
  exampleDetailRouter,
  examplesRouter,
  projectOrganizationRouter,
)

const bestPracticesParser = oneOf(
  bestPracticesSideEffectsRouter,
  bestPracticesMessagesRouter,
  bestPracticesKeyingRouter,
  bestPracticesImmutabilityRouter,
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
  coreSubscriptionsRouter,
  coreInitAndFlagsRouter,
  coreDomRouter,
  coreRenderRouter,
  coreFileRouter,
  coreRunningYourAppRouter,
  coreResourcesRouter,
  coreManagedResourcesRouter,
  coreDevToolsRouter,
  coreCrashViewRouter,
  coreSlowViewRouter,
  coreFreezeModelRouter,
  coreViewMemoizationRouter,
)

const patternsParser = oneOf(patternsSubmodelsRouter, patternsOutMessageRouter)

const uiParser = oneOf(
  uiOverviewRouter,
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
  topLevelDocsParser,
  coreParser,
  bestPracticesParser,
  patternsParser,
  uiParser,
  aiParser,
)

export const newsletterRouter = pipe(
  literal('newsletter'),
  mapTo(NewsletterRoute),
)

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
