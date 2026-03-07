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
export const WhyFoldkitRoute = r('WhyFoldkit')
export const ComingFromReactRoute = r('ComingFromReact')
export const GettingStartedRoute = r('GettingStarted')
export const RoutingAndNavigationRoute = r('RoutingAndNavigation')
export const FieldValidationRoute = r('FieldValidation')
export const ExamplesRoute = r('Examples')
export const BestPracticesRoute = r('BestPractices')
export const ProjectOrganizationRoute = r('ProjectOrganization')
export const ApiModuleRoute = r('ApiModule', { moduleSlug: S.String })

export const CoreCounterExampleRoute = r('CoreCounterExample')
export const CoreModelRoute = r('CoreModel')
export const CoreMessagesRoute = r('CoreMessages')
export const CoreUpdateRoute = r('CoreUpdate')
export const CoreViewRoute = r('CoreView')
export const CoreCommandsRoute = r('CoreCommands')
export const CoreSubscriptionsRoute = r('CoreSubscriptions')
export const CoreInitRoute = r('CoreInit')
export const CoreTaskRoute = r('CoreTask')
export const CoreRunningYourAppRoute = r('CoreRunningYourApp')
export const CoreResourcesRoute = r('CoreResources')
export const CoreManagedResourcesRoute = r('CoreManagedResources')
export const CoreErrorViewRoute = r('CoreErrorView')
export const CoreSlowViewWarningRoute = r('CoreSlowViewWarning')
export const CoreViewMemoizationRoute = r('CoreViewMemoization')

export const PatternsSubmodelsRoute = r('PatternsSubmodels')
export const PatternsModelAsUnionRoute = r('PatternsModelAsUnion')
export const PatternsOutMessageRoute = r('PatternsOutMessage')

export const UiTabsRoute = r('UiTabs')
export const UiDisclosureRoute = r('UiDisclosure')
export const UiDialogRoute = r('UiDialog')
export const UiMenuRoute = r('UiMenu')
export const UiPopoverRoute = r('UiPopover')
export const UiListboxRoute = r('UiListbox')
export const UiSwitchRoute = r('UiSwitch')
export const UiComboboxRoute = r('UiCombobox')

export const NotFoundRoute = r('NotFound', { path: S.String })

export const DocsRoute = S.Union(
  WhyFoldkitRoute,
  ComingFromReactRoute,
  GettingStartedRoute,
  RoutingAndNavigationRoute,
  FieldValidationRoute,
  ExamplesRoute,
  BestPracticesRoute,
  ProjectOrganizationRoute,
  ApiModuleRoute,
  CoreCounterExampleRoute,
  CoreModelRoute,
  CoreMessagesRoute,
  CoreUpdateRoute,
  CoreViewRoute,
  CoreCommandsRoute,
  CoreSubscriptionsRoute,
  CoreInitRoute,
  CoreTaskRoute,
  CoreRunningYourAppRoute,
  CoreResourcesRoute,
  CoreManagedResourcesRoute,
  CoreErrorViewRoute,
  CoreSlowViewWarningRoute,
  CoreViewMemoizationRoute,
  PatternsSubmodelsRoute,
  PatternsModelAsUnionRoute,
  PatternsOutMessageRoute,
  UiTabsRoute,
  UiDisclosureRoute,
  UiDialogRoute,
  UiMenuRoute,
  UiPopoverRoute,
  UiListboxRoute,
  UiSwitchRoute,
  UiComboboxRoute,
  NotFoundRoute,
)
export type DocsRoute = typeof DocsRoute.Type

export const AppRoute = S.Union(HomeRoute, DocsRoute)

export type HomeRoute = typeof HomeRoute.Type
export type WhyFoldkitRoute = typeof WhyFoldkitRoute.Type
export type ComingFromReactRoute = typeof ComingFromReactRoute.Type
export type GettingStartedRoute = typeof GettingStartedRoute.Type
export type RoutingAndNavigationRoute =
  typeof RoutingAndNavigationRoute.Type
export type FieldValidationRoute = typeof FieldValidationRoute.Type
export type ExamplesRoute = typeof ExamplesRoute.Type
export type BestPracticesRoute = typeof BestPracticesRoute.Type
export type ProjectOrganizationRoute =
  typeof ProjectOrganizationRoute.Type
export type ApiModuleRoute = typeof ApiModuleRoute.Type
export type CoreCounterExampleRoute =
  typeof CoreCounterExampleRoute.Type
export type CoreModelRoute = typeof CoreModelRoute.Type
export type CoreMessagesRoute = typeof CoreMessagesRoute.Type
export type CoreUpdateRoute = typeof CoreUpdateRoute.Type
export type CoreViewRoute = typeof CoreViewRoute.Type
export type CoreCommandsRoute = typeof CoreCommandsRoute.Type
export type CoreSubscriptionsRoute =
  typeof CoreSubscriptionsRoute.Type
export type CoreInitRoute = typeof CoreInitRoute.Type
export type CoreTaskRoute = typeof CoreTaskRoute.Type
export type CoreRunningYourAppRoute =
  typeof CoreRunningYourAppRoute.Type
export type CoreResourcesRoute = typeof CoreResourcesRoute.Type
export type CoreManagedResourcesRoute =
  typeof CoreManagedResourcesRoute.Type
export type CoreErrorViewRoute = typeof CoreErrorViewRoute.Type
export type CoreSlowViewWarningRoute =
  typeof CoreSlowViewWarningRoute.Type
export type PatternsSubmodelsRoute =
  typeof PatternsSubmodelsRoute.Type
export type PatternsModelAsUnionRoute =
  typeof PatternsModelAsUnionRoute.Type
export type PatternsOutMessageRoute =
  typeof PatternsOutMessageRoute.Type
export type CoreViewMemoizationRoute =
  typeof CoreViewMemoizationRoute.Type
export type UiTabsRoute = typeof UiTabsRoute.Type
export type UiDisclosureRoute = typeof UiDisclosureRoute.Type
export type UiDialogRoute = typeof UiDialogRoute.Type
export type UiMenuRoute = typeof UiMenuRoute.Type
export type UiPopoverRoute = typeof UiPopoverRoute.Type
export type UiListboxRoute = typeof UiListboxRoute.Type
export type UiSwitchRoute = typeof UiSwitchRoute.Type
export type UiComboboxRoute = typeof UiComboboxRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

// ROUTERS

export const homeRouter = pipe(root, mapTo(HomeRoute))
export const whyFoldkitRouter = pipe(
  literal('why-foldkit'),
  mapTo(WhyFoldkitRoute),
)
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
export const bestPracticesRouter = pipe(
  literal('best-practices'),
  mapTo(BestPracticesRoute),
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
export const coreInitRouter = pipe(
  literal('core'),
  slash(literal('init')),
  mapTo(CoreInitRoute),
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
export const coreErrorViewRouter = pipe(
  literal('core'),
  slash(literal('error-view')),
  mapTo(CoreErrorViewRoute),
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
export const patternsModelAsUnionRouter = pipe(
  literal('patterns'),
  slash(literal('model-as-union')),
  mapTo(PatternsModelAsUnionRoute),
)
export const patternsOutMessageRouter = pipe(
  literal('patterns'),
  slash(literal('out-message')),
  mapTo(PatternsOutMessageRoute),
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

// PARSER

const legacyDocsParser = oneOf(
  whyFoldkitRouter,
  comingFromReactRouter,
  gettingStartedRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
  examplesRouter,
  bestPracticesRouter,
  projectOrganizationRouter,
)

const coreParser = oneOf(
  coreCounterExampleRouter,
  coreModelRouter,
  coreMessagesRouter,
  coreUpdateRouter,
  coreViewRouter,
  coreCommandsRouter,
  coreSubscriptionsRouter,
  coreInitRouter,
  coreTaskRouter,
  coreRunningYourAppRouter,
)

const coreExtendedParser = oneOf(
  coreResourcesRouter,
  coreManagedResourcesRouter,
  coreErrorViewRouter,
  coreSlowViewWarningRouter,
  coreViewMemoizationRouter,
)

const patternsParser = oneOf(
  patternsSubmodelsRouter,
  patternsModelAsUnionRouter,
  patternsOutMessageRouter,
)

const uiParser = oneOf(
  uiTabsRouter,
  uiDisclosureRouter,
  uiDialogRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiListboxRouter,
  uiSwitchRouter,
  uiComboboxRouter,
)

const docsParser = oneOf(
  legacyDocsParser,
  coreParser,
  coreExtendedParser,
  patternsParser,
  uiParser,
)

export const routeParser = oneOf(
  docsParser,
  apiModuleRouter,
  homeRouter,
)

export const urlToAppRoute = parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
