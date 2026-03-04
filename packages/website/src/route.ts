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
export const ArchitectureAndConceptsRoute = r(
  'ArchitectureAndConcepts',
)
export const RoutingAndNavigationRoute = r('RoutingAndNavigation')
export const FieldValidationRoute = r('FieldValidation')
export const ExamplesRoute = r('Examples')
export const BestPracticesRoute = r('BestPractices')
export const ProjectOrganizationRoute = r('ProjectOrganization')
export const AdvancedPatternsRoute = r('AdvancedPatterns')
export const ApiModuleRoute = r('ApiModule', { moduleSlug: S.String })
export const FoldkitUiRoute = r('FoldkitUi')
export const NotFoundRoute = r('NotFound', { path: S.String })

export const DocsRoute = S.Union(
  WhyFoldkitRoute,
  ComingFromReactRoute,
  GettingStartedRoute,
  ArchitectureAndConceptsRoute,
  RoutingAndNavigationRoute,
  FieldValidationRoute,
  ExamplesRoute,
  BestPracticesRoute,
  ProjectOrganizationRoute,
  AdvancedPatternsRoute,
  ApiModuleRoute,
  FoldkitUiRoute,
  NotFoundRoute,
)
export type DocsRoute = typeof DocsRoute.Type

export const AppRoute = S.Union(HomeRoute, DocsRoute)

export type HomeRoute = typeof HomeRoute.Type
export type WhyFoldkitRoute = typeof WhyFoldkitRoute.Type
export type ComingFromReactRoute = typeof ComingFromReactRoute.Type
export type GettingStartedRoute = typeof GettingStartedRoute.Type
export type ArchitectureAndConceptsRoute =
  typeof ArchitectureAndConceptsRoute.Type
export type RoutingAndNavigationRoute =
  typeof RoutingAndNavigationRoute.Type
export type FieldValidationRoute = typeof FieldValidationRoute.Type
export type ExamplesRoute = typeof ExamplesRoute.Type
export type BestPracticesRoute = typeof BestPracticesRoute.Type
export type ProjectOrganizationRoute =
  typeof ProjectOrganizationRoute.Type
export type AdvancedPatternsRoute = typeof AdvancedPatternsRoute.Type
export type ApiModuleRoute = typeof ApiModuleRoute.Type
export type FoldkitUiRoute = typeof FoldkitUiRoute.Type
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
export const architectureAndConceptsRouter = pipe(
  literal('architecture-and-concepts'),
  mapTo(ArchitectureAndConceptsRoute),
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
export const advancedPatternsRouter = pipe(
  literal('advanced-patterns'),
  mapTo(AdvancedPatternsRoute),
)
export const apiModuleRouter = pipe(
  literal('api-reference'),
  slash(string('moduleSlug')),
  mapTo(ApiModuleRoute),
)
export const foldkitUiRouter = pipe(
  literal('foldkit-ui'),
  mapTo(FoldkitUiRoute),
)

// PARSER

const docsParser = oneOf(
  whyFoldkitRouter,
  comingFromReactRouter,
  gettingStartedRouter,
  architectureAndConceptsRouter,
  routingAndNavigationRouter,
  fieldValidationRouter,
  examplesRouter,
  bestPracticesRouter,
  projectOrganizationRouter,
  advancedPatternsRouter,
)

export const routeParser = oneOf(
  docsParser,
  apiModuleRouter,
  foldkitUiRouter,
  homeRouter,
)

export const urlToAppRoute = parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)
