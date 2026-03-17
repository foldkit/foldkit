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
export const ComingFromReactRoute = r('ComingFromReact')
export const GettingStartedRoute = r('GettingStarted')
export const RoutingAndNavigationRoute = r('RoutingAndNavigation')
export const FieldValidationRoute = r('FieldValidation')
export const ExamplesRoute = r('Examples')
export const ExampleDetailRoute = r('ExampleDetail', {
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
export const CoreSubscriptionsRoute = r('CoreSubscriptions')
export const CoreInitAndFlagsRoute = r('CoreInitAndFlags')
export const CoreTaskRoute = r('CoreTask')
export const CoreRunningYourAppRoute = r('CoreRunningYourApp')
export const CoreResourcesRoute = r('CoreResources')
export const CoreManagedResourcesRoute = r('CoreManagedResources')
export const CoreDevtoolsRoute = r('CoreDevtools')
export const CoreCrashViewRoute = r('CoreCrashView')
export const CoreSlowViewWarningRoute = r('CoreSlowViewWarning')
export const CoreViewMemoizationRoute = r('CoreViewMemoization')

export const PatternsSubmodelsRoute = r('PatternsSubmodels')
export const PatternsOutMessageRoute = r('PatternsOutMessage')

export const UiOverviewRoute = r('UiOverview')
export const UiButtonRoute = r('UiButton')
export const UiCheckboxRoute = r('UiCheckbox')
export const UiTabsRoute = r('UiTabs')
export const UiDisclosureRoute = r('UiDisclosure')
export const UiDialogRoute = r('UiDialog')
export const UiMenuRoute = r('UiMenu')
export const UiPopoverRoute = r('UiPopover')
export const UiListboxRoute = r('UiListbox')
export const UiRadioGroupRoute = r('UiRadioGroup')
export const UiSelectRoute = r('UiSelect')
export const UiSwitchRoute = r('UiSwitch')
export const UiComboboxRoute = r('UiCombobox')
export const UiInputRoute = r('UiInput')
export const UiTextareaRoute = r('UiTextarea')
export const UiFieldsetRoute = r('UiFieldset')

export const AiOverviewRoute = r('AiOverview')
export const AiSkillsRoute = r('AiSkills')

export const NewsletterRoute = r('Newsletter')

export const NotFoundRoute = r('NotFound', { path: S.String })

export const DocsRoute = S.Union(
  ManifestoRoute,
  ComingFromReactRoute,
  GettingStartedRoute,
  RoutingAndNavigationRoute,
  FieldValidationRoute,
  ExamplesRoute,
  ExampleDetailRoute,
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
  CoreSubscriptionsRoute,
  CoreInitAndFlagsRoute,
  CoreTaskRoute,
  CoreRunningYourAppRoute,
  CoreResourcesRoute,
  CoreManagedResourcesRoute,
  CoreDevtoolsRoute,
  CoreCrashViewRoute,
  CoreSlowViewWarningRoute,
  CoreViewMemoizationRoute,
  PatternsSubmodelsRoute,
  PatternsOutMessageRoute,
  UiOverviewRoute,
  UiButtonRoute,
  UiCheckboxRoute,
  UiTabsRoute,
  UiDisclosureRoute,
  UiDialogRoute,
  UiMenuRoute,
  UiPopoverRoute,
  UiListboxRoute,
  UiRadioGroupRoute,
  UiSelectRoute,
  UiSwitchRoute,
  UiComboboxRoute,
  UiInputRoute,
  UiTextareaRoute,
  UiFieldsetRoute,
  AiOverviewRoute,
  AiSkillsRoute,
  NotFoundRoute,
)
export type DocsRoute = typeof DocsRoute.Type

export const AppRoute = S.Union(HomeRoute, NewsletterRoute, DocsRoute)
export type AppRoute = typeof AppRoute.Type

// ROUTERS

export const homeRouter = pipe(root, mapTo(HomeRoute))
export const manifestoRouter = pipe(literal('manifesto'), mapTo(ManifestoRoute))
export const comingFromReactRouter = pipe(
  literal('coming-from-react'),
  mapTo(ComingFromReactRoute),
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
export const examplesRouter = pipe(
  literal('example-apps'),
  mapTo(ExamplesRoute),
)
export const exampleDetailRouter = pipe(
  literal('example-apps'),
  slash(string('exampleSlug')),
  mapTo(ExampleDetailRoute),
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
export const coreTaskRouter = pipe(
  literal('core'),
  slash(literal('task')),
  mapTo(CoreTaskRoute),
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
export const coreDevtoolsRouter = pipe(
  literal('core'),
  slash(literal('devtools')),
  mapTo(CoreDevtoolsRoute),
)
export const coreCrashViewRouter = pipe(
  literal('core'),
  slash(literal('crash-view')),
  mapTo(CoreCrashViewRoute),
)
export const coreSlowViewWarningRouter = pipe(
  literal('core'),
  slash(literal('slow-view-warning')),
  mapTo(CoreSlowViewWarningRoute),
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

// PARSER

const topLevelDocsParser = oneOf(
  manifestoRouter,
  comingFromReactRouter,
  gettingStartedRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
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
  coreSubscriptionsRouter,
  coreInitAndFlagsRouter,
  coreTaskRouter,
  coreRunningYourAppRouter,
  coreResourcesRouter,
  coreManagedResourcesRouter,
  coreDevtoolsRouter,
  coreCrashViewRouter,
  coreSlowViewWarningRouter,
  coreViewMemoizationRouter,
)

const patternsParser = oneOf(patternsSubmodelsRouter, patternsOutMessageRouter)

const uiParser = oneOf(
  uiOverviewRouter,
  uiButtonRouter,
  uiCheckboxRouter,
  uiTabsRouter,
  uiDisclosureRouter,
  uiDialogRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiListboxRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSwitchRouter,
  uiComboboxRouter,
  uiInputRouter,
  uiTextareaRouter,
  uiFieldsetRouter,
)

const aiParser = oneOf(aiOverviewRouter, aiSkillsRouter)

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
  homeRouter,
)

export const urlToAppRoute = parseUrlWithFallback(routeParser, NotFoundRoute)

export const isLandingHeaderAlwaysVisible = (route: AppRoute) =>
  route._tag === 'Newsletter'
