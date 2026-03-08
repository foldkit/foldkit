import { Command, FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import {
  Array,
  Console,
  DateTime,
  Deferred,
  Effect,
  Match as M,
  Schema as S,
  String as Str,
  Stream,
  pipe,
} from 'effect'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium } from 'playwright'

import { moduleNameToSlug } from '../src/page/apiReference/domain'
import {
  ApiModuleRoute,
  AppRoute,
  BestPracticesRoute,
  ComingFromReactRoute,
  CoreArchitectureRoute,
  CoreCommandsRoute,
  CoreCounterExampleRoute,
  CoreErrorViewRoute,
  CoreInitRoute,
  CoreManagedResourcesRoute,
  CoreMessagesRoute,
  CoreModelRoute,
  CoreResourcesRoute,
  CoreRunningYourAppRoute,
  CoreSlowViewWarningRoute,
  CoreSubscriptionsRoute,
  CoreTaskRoute,
  CoreUpdateRoute,
  CoreViewMemoizationRoute,
  CoreViewRoute,
  ExamplesRoute,
  FieldValidationRoute,
  GettingStartedRoute,
  HomeRoute,
  ManifestoRoute,
  PatternsOutMessageRoute,
  PatternsSubmodelsRoute,
  ProjectOrganizationRoute,
  RoutingAndNavigationRoute,
  UiButtonRoute,
  UiCheckboxRoute,
  UiComboboxRoute,
  UiDialogRoute,
  UiDisclosureRoute,
  UiInputRoute,
  UiListboxRoute,
  UiMenuRoute,
  UiPopoverRoute,
  UiRadioGroupRoute,
  UiSwitchRoute,
  UiTabsRoute,
  apiModuleRouter,
  bestPracticesRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreErrorViewRouter,
  coreInitRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreResourcesRouter,
  coreRunningYourAppRouter,
  coreSlowViewWarningRouter,
  coreSubscriptionsRouter,
  coreTaskRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  homeRouter,
  manifestoRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
  projectOrganizationRouter,
  routingAndNavigationRouter,
  uiButtonRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSwitchRouter,
  uiTabsRouter,
} from '../src/route'

// ROUTES

export const STATIC_ROUTES: ReadonlyArray<AppRoute> = [
  HomeRoute(),
  ManifestoRoute(),
  GettingStartedRoute(),
  ComingFromReactRoute(),
  RoutingAndNavigationRoute(),
  FieldValidationRoute(),
  ExamplesRoute(),
  BestPracticesRoute(),
  ProjectOrganizationRoute(),
  CoreArchitectureRoute(),
  CoreCounterExampleRoute(),
  CoreModelRoute(),
  CoreMessagesRoute(),
  CoreUpdateRoute(),
  CoreViewRoute(),
  CoreCommandsRoute(),
  CoreSubscriptionsRoute(),
  CoreInitRoute(),
  CoreTaskRoute(),
  CoreRunningYourAppRoute(),
  CoreResourcesRoute(),
  CoreManagedResourcesRoute(),
  CoreErrorViewRoute(),
  CoreSlowViewWarningRoute(),
  PatternsSubmodelsRoute(),
  PatternsOutMessageRoute(),
  CoreViewMemoizationRoute(),
  UiTabsRoute(),
  UiDisclosureRoute(),
  UiDialogRoute(),
  UiMenuRoute(),
  UiPopoverRoute(),
  UiListboxRoute(),
  UiRadioGroupRoute(),
  UiSwitchRoute(),
  UiButtonRoute(),
  UiCheckboxRoute(),
  UiComboboxRoute(),
  UiInputRoute(),
]

export const routeToUrlPath = (route: AppRoute): string =>
  M.value(route).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Home: () => homeRouter(),
      Manifesto: () => manifestoRouter(),
      GettingStarted: () => gettingStartedRouter(),
      ComingFromReact: () => comingFromReactRouter(),
      RoutingAndNavigation: () => routingAndNavigationRouter(),
      FieldValidation: () => fieldValidationRouter(),
      Examples: () => examplesRouter(),
      BestPractices: () => bestPracticesRouter(),
      ProjectOrganization: () => projectOrganizationRouter(),
      CoreArchitecture: () => coreArchitectureRouter(),
      CoreCounterExample: () => coreCounterExampleRouter(),
      CoreModel: () => coreModelRouter(),
      CoreMessages: () => coreMessagesRouter(),
      CoreUpdate: () => coreUpdateRouter(),
      CoreView: () => coreViewRouter(),
      CoreCommands: () => coreCommandsRouter(),
      CoreSubscriptions: () => coreSubscriptionsRouter(),
      CoreInit: () => coreInitRouter(),
      CoreTask: () => coreTaskRouter(),
      CoreRunningYourApp: () => coreRunningYourAppRouter(),
      CoreResources: () => coreResourcesRouter(),
      CoreManagedResources: () => coreManagedResourcesRouter(),
      CoreErrorView: () => coreErrorViewRouter(),
      CoreSlowViewWarning: () => coreSlowViewWarningRouter(),
      PatternsSubmodels: () => patternsSubmodelsRouter(),
      PatternsOutMessage: () => patternsOutMessageRouter(),
      CoreViewMemoization: () => coreViewMemoizationRouter(),
      UiTabs: () => uiTabsRouter(),
      UiDisclosure: () => uiDisclosureRouter(),
      UiDialog: () => uiDialogRouter(),
      UiMenu: () => uiMenuRouter(),
      UiPopover: () => uiPopoverRouter(),
      UiListbox: () => uiListboxRouter(),
      UiRadioGroup: () => uiRadioGroupRouter(),
      UiSwitch: () => uiSwitchRouter(),
      UiButton: () => uiButtonRouter(),
      UiCheckbox: () => uiCheckboxRouter(),
      UiCombobox: () => uiComboboxRouter(),
      UiInput: () => uiInputRouter(),
      ApiModule: ({ moduleSlug }) => apiModuleRouter({ moduleSlug }),
      NotFound: () => '/',
    }),
  )

export const routeToOutputPath = (route: AppRoute): string => {
  const urlPath = routeToUrlPath(route)
  return urlPath === '/' ? 'index.html' : `${urlPath.slice(1)}/index.html`
}

const ROOT_PLACEHOLDER = '<div id="root"></div>'

export const injectHtml = (baseHtml: string, renderedHtml: string): string =>
  baseHtml.replace(ROOT_PLACEHOLDER, `<div id="root">${renderedHtml}</div>`)

export const enumerateRoutes = (
  apiModuleNames: ReadonlyArray<string>,
): ReadonlyArray<AppRoute> =>
  pipe(
    STATIC_ROUTES,
    Array.appendAll(
      Array.map(apiModuleNames, moduleSlug => ApiModuleRoute({ moduleSlug })),
    ),
  )

// PATHS

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEBSITE_DIR = resolve(SCRIPT_DIR, '..')
const DIST_DIR = resolve(WEBSITE_DIR, 'dist')
const API_JSON_PATH = resolve(WEBSITE_DIR, 'src/generated/api.json')

// SERVICES

const PREVIEW_PORT = 4173
const PREVIEW_BASE_URL = `http://localhost:${PREVIEW_PORT}`

const previewServerResource = Effect.acquireRelease(
  Effect.gen(function* () {
    const cmd = Command.make(
      'pnpm',
      'exec',
      'vite',
      'preview',
      '--port',
      String(PREVIEW_PORT),
      '--strictPort',
    ).pipe(Command.workingDirectory(WEBSITE_DIR))

    const serverProcess = yield* Command.start(cmd)
    const ready = yield* Deferred.make<void>()

    const checkLine = (line: string): Effect.Effect<void> =>
      line.includes('localhost')
        ? Deferred.succeed(ready, undefined).pipe(Effect.asVoid)
        : Effect.void

    yield* serverProcess.stdout.pipe(
      Stream.decodeText('utf-8'),
      Stream.splitLines,
      Stream.runForEach(checkLine),
      Effect.forkDaemon,
    )

    yield* Deferred.await(ready)
    return serverProcess
  }),
  serverProcess => serverProcess.kill().pipe(Effect.ignore),
).pipe(Effect.asVoid)

const playwrightBrowserResource = Effect.acquireRelease(
  Effect.tryPromise(() => chromium.launch({ headless: true })),
  browser => Effect.promise(() => browser.close()),
)

const captureRouteHtml = (browser: Browser, url: string) =>
  Effect.acquireUseRelease(
    Effect.tryPromise(() => browser.newPage()),
    page =>
      Effect.gen(function* () {
        yield* Effect.tryPromise(() => page.goto(url))
        yield* Effect.tryPromise(() =>
          page.waitForFunction(() => {
            const firstChild = document.body.firstElementChild
            return (
              firstChild !== null &&
              firstChild.id !== 'root' &&
              firstChild.children.length > 0
            )
          }),
        )
        return yield* Effect.tryPromise(() =>
          page.evaluate(() => document.body.firstElementChild?.outerHTML ?? ''),
        )
      }),
    page => Effect.promise(() => page.close()),
  )

// PRERENDER

const ApiDocJson = S.parseJson(
  S.Struct({
    children: S.Array(S.Struct({ name: S.String })),
  }),
)

const readApiModuleNames = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const raw = yield* fs.readFileString(API_JSON_PATH)
  const apiDoc = yield* S.decodeUnknown(ApiDocJson)(raw)
  return Array.map(apiDoc.children, ({ name }) => moduleNameToSlug(name))
})

const prerenderRoute =
  (browser: Browser, baseHtml: string) => (route: AppRoute) =>
    Effect.gen(function* () {
      const urlPath = routeToUrlPath(route)
      const outputPath = routeToOutputPath(route)
      const url = `${PREVIEW_BASE_URL}${urlPath}`
      const outputFilePath = resolve(DIST_DIR, outputPath)

      const renderedHtml = yield* captureRouteHtml(browser, url)
      const outputHtml = injectHtml(baseHtml, renderedHtml)

      const fs = yield* FileSystem.FileSystem
      yield* fs.makeDirectory(dirname(outputFilePath), {
        recursive: true,
      })
      yield* fs.writeFileString(outputFilePath, outputHtml)
      yield* Console.log(`  ✓ ${urlPath}`)
    }).pipe(
      Effect.catchAll(error =>
        Console.warn(`  ✗ ${routeToUrlPath(route)}: ${String(error)}`),
      ),
    )

// SITEMAP

const SITE_URL = 'https://foldkit.dev'

const formatDateIso = (dateTime: DateTime.DateTime): string => {
  const { year, month, day } = DateTime.toPartsUtc(dateTime)
  return pipe(
    [String(year), String(month), String(day)],
    Array.map(Str.padStart(2, '0')),
    Array.join('-'),
  )
}

const routeToSitemapEntry = (lastModification: string) => (route: AppRoute) => {
  const urlPath = routeToUrlPath(route)
  return `<url>
  <loc>${SITE_URL}${urlPath}</loc>
  <lastmod>${lastModification}</lastmod>
</url>`
}

const buildSitemap = (
  routes: ReadonlyArray<AppRoute>,
  lastModification: string,
): string => {
  const entries = pipe(
    routes,
    Array.map(routeToSitemapEntry(lastModification)),
    Array.join('\n'),
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

// PROGRAM

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Console.log('Starting prerender...')

    yield* previewServerResource
    const browser = yield* playwrightBrowserResource

    const apiModuleNames = yield* readApiModuleNames
    const routes = enumerateRoutes(apiModuleNames)

    const fs = yield* FileSystem.FileSystem
    const baseHtml = yield* fs.readFileString(resolve(DIST_DIR, 'index.html'))

    yield* Effect.forEach(routes, prerenderRoute(browser, baseHtml), {
      concurrency: 4,
    })

    const lastModification = formatDateIso(yield* DateTime.now)
    yield* fs.writeFileString(
      resolve(DIST_DIR, 'sitemap.xml'),
      buildSitemap(routes, lastModification),
    )

    yield* Console.log(`Prerendered ${routes.length} routes.`)
  }),
)

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
