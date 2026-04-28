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
import { exampleSlugs } from '../src/page/example/meta'
import {
  AiMcpRoute,
  AiOverviewRoute,
  AiSkillsRoute,
  ApiModuleRoute,
  AppRoute,
  BestPracticesImmutabilityRoute,
  BestPracticesKeyingRoute,
  BestPracticesMessagesRoute,
  BestPracticesSideEffectsRoute,
  ComingFromReactRoute,
  CoreArchitectureRoute,
  CoreCommandsRoute,
  CoreCounterExampleRoute,
  CoreCrashViewRoute,
  CoreDevToolsRoute,
  CoreFileRoute,
  CoreFreezeModelRoute,
  CoreInitAndFlagsRoute,
  CoreManagedResourcesRoute,
  CoreMessagesRoute,
  CoreModelRoute,
  CoreResourcesRoute,
  CoreRunningYourAppRoute,
  CoreSlowViewRoute,
  CoreSubscriptionsRoute,
  CoreTaskRoute,
  CoreUpdateRoute,
  CoreViewMemoizationRoute,
  CoreViewRoute,
  ExampleDetailRoute,
  ExamplesRoute,
  FieldValidationRoute,
  GettingStartedRoute,
  HomeRoute,
  ManifestoRoute,
  NewsletterRoute,
  PatternsOutMessageRoute,
  PatternsSubmodelsRoute,
  ProjectOrganizationRoute,
  ReactComparisonRoute,
  RoutingAndNavigationRoute,
  TestingRoute,
  TestingSceneRoute,
  TestingStoryRoute,
  UiAnimationRoute,
  UiButtonRoute,
  UiCalendarRoute,
  UiCheckboxRoute,
  UiComboboxRoute,
  UiDatePickerRoute,
  UiDialogRoute,
  UiDisclosureRoute,
  UiDragAndDropRoute,
  UiFieldsetRoute,
  UiFileDropRoute,
  UiInputRoute,
  UiListboxRoute,
  UiMenuRoute,
  UiOverviewRoute,
  UiPopoverRoute,
  UiRadioGroupRoute,
  UiSelectRoute,
  UiSliderRoute,
  UiSwitchRoute,
  UiTabsRoute,
  UiTextareaRoute,
  UiToastRoute,
  UiTooltipRoute,
  UiVirtualListRoute,
  aiMcpRouter,
  aiOverviewRouter,
  aiSkillsRouter,
  apiModuleRouter,
  bestPracticesImmutabilityRouter,
  bestPracticesKeyingRouter,
  bestPracticesMessagesRouter,
  bestPracticesSideEffectsRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreDevToolsRouter,
  coreFileRouter,
  coreFreezeModelRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreResourcesRouter,
  coreRunningYourAppRouter,
  coreSlowViewRouter,
  coreSubscriptionsRouter,
  coreTaskRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  exampleDetailRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  homeRouter,
  manifestoRouter,
  newsletterRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
  playgroundRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  uiAnimationRouter,
  uiButtonRouter,
  uiCalendarRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDatePickerRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiDragAndDropRouter,
  uiFieldsetRouter,
  uiFileDropRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiOverviewRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSliderRouter,
  uiSwitchRouter,
  uiTabsRouter,
  uiTextareaRouter,
  uiToastRouter,
  uiTooltipRouter,
  uiVirtualListRouter,
} from '../src/route'
import { generateOgImages, injectMetaTags } from './og-image'

// ROUTES

export const STATIC_ROUTES: ReadonlyArray<AppRoute> = [
  HomeRoute(),
  NewsletterRoute(),
  ManifestoRoute(),
  GettingStartedRoute(),
  ComingFromReactRoute(),
  ReactComparisonRoute(),
  RoutingAndNavigationRoute(),
  FieldValidationRoute(),
  TestingRoute(),
  TestingStoryRoute(),
  TestingSceneRoute(),
  ExamplesRoute(),
  ...Array.map(exampleSlugs, slug => ExampleDetailRoute({ exampleSlug: slug })),
  BestPracticesSideEffectsRoute(),
  BestPracticesMessagesRoute(),
  BestPracticesKeyingRoute(),
  BestPracticesImmutabilityRoute(),
  ProjectOrganizationRoute(),
  CoreArchitectureRoute(),
  CoreCounterExampleRoute(),
  CoreModelRoute(),
  CoreMessagesRoute(),
  CoreUpdateRoute(),
  CoreViewRoute(),
  CoreCommandsRoute(),
  CoreSubscriptionsRoute(),
  CoreInitAndFlagsRoute(),
  CoreTaskRoute(),
  CoreFileRoute(),
  CoreRunningYourAppRoute(),
  CoreResourcesRoute(),
  CoreManagedResourcesRoute(),
  CoreDevToolsRoute(),
  CoreCrashViewRoute(),
  CoreSlowViewRoute(),
  CoreFreezeModelRoute(),
  PatternsSubmodelsRoute(),
  PatternsOutMessageRoute(),
  CoreViewMemoizationRoute(),
  UiOverviewRoute(),
  UiTabsRoute(),
  UiDisclosureRoute(),
  UiDialogRoute(),
  UiMenuRoute(),
  UiPopoverRoute(),
  UiListboxRoute(),
  UiRadioGroupRoute(),
  UiSelectRoute(),
  UiSliderRoute(),
  UiSwitchRoute(),
  UiButtonRoute(),
  UiCalendarRoute(),
  UiDatePickerRoute(),
  UiCheckboxRoute(),
  UiComboboxRoute(),
  UiInputRoute(),
  UiTextareaRoute(),
  UiFieldsetRoute(),
  UiDragAndDropRoute(),
  UiFileDropRoute(),
  UiToastRoute(),
  UiTooltipRoute(),
  UiAnimationRoute(),
  UiVirtualListRoute(),
  AiOverviewRoute(),
  AiSkillsRoute(),
  AiMcpRoute(),
]

export const routeToUrlPath = (route: AppRoute): string =>
  M.value(route).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Home: () => homeRouter(),
      Manifesto: () => manifestoRouter(),
      GettingStarted: () => gettingStartedRouter(),
      ComingFromReact: () => comingFromReactRouter(),
      ReactComparison: () => reactComparisonRouter(),
      RoutingAndNavigation: () => routingAndNavigationRouter(),
      FieldValidation: () => fieldValidationRouter(),
      Testing: () => testingRouter(),
      TestingStory: () => testingStoryRouter(),
      TestingScene: () => testingSceneRouter(),
      Examples: () => examplesRouter(),
      ExampleDetail: ({ exampleSlug }) => exampleDetailRouter({ exampleSlug }),
      BestPracticesSideEffects: () => bestPracticesSideEffectsRouter(),
      BestPracticesMessages: () => bestPracticesMessagesRouter(),
      BestPracticesKeying: () => bestPracticesKeyingRouter(),
      BestPracticesImmutability: () => bestPracticesImmutabilityRouter(),
      ProjectOrganization: () => projectOrganizationRouter(),
      CoreArchitecture: () => coreArchitectureRouter(),
      CoreCounterExample: () => coreCounterExampleRouter(),
      CoreModel: () => coreModelRouter(),
      CoreMessages: () => coreMessagesRouter(),
      CoreUpdate: () => coreUpdateRouter(),
      CoreView: () => coreViewRouter(),
      CoreCommands: () => coreCommandsRouter(),
      CoreSubscriptions: () => coreSubscriptionsRouter(),
      CoreInitAndFlags: () => coreInitAndFlagsRouter(),
      CoreTask: () => coreTaskRouter(),
      CoreFile: () => coreFileRouter(),
      CoreRunningYourApp: () => coreRunningYourAppRouter(),
      CoreResources: () => coreResourcesRouter(),
      CoreManagedResources: () => coreManagedResourcesRouter(),
      CoreDevTools: () => coreDevToolsRouter(),
      CoreCrashView: () => coreCrashViewRouter(),
      CoreSlowView: () => coreSlowViewRouter(),
      CoreFreezeModel: () => coreFreezeModelRouter(),
      PatternsSubmodels: () => patternsSubmodelsRouter(),
      PatternsOutMessage: () => patternsOutMessageRouter(),
      CoreViewMemoization: () => coreViewMemoizationRouter(),
      UiOverview: () => uiOverviewRouter(),
      UiTabs: () => uiTabsRouter(),
      UiDisclosure: () => uiDisclosureRouter(),
      UiDialog: () => uiDialogRouter(),
      UiMenu: () => uiMenuRouter(),
      UiPopover: () => uiPopoverRouter(),
      UiListbox: () => uiListboxRouter(),
      UiRadioGroup: () => uiRadioGroupRouter(),
      UiSelect: () => uiSelectRouter(),
      UiSlider: () => uiSliderRouter(),
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
      UiToast: () => uiToastRouter(),
      UiTooltip: () => uiTooltipRouter(),
      UiAnimation: () => uiAnimationRouter(),
      UiVirtualList: () => uiVirtualListRouter(),
      AiOverview: () => aiOverviewRouter(),
      AiSkills: () => aiSkillsRouter(),
      AiMcp: () => aiMcpRouter(),
      ApiModule: ({ moduleSlug }) => apiModuleRouter({ moduleSlug }),
      Playground: ({ exampleSlug }) => playgroundRouter({ exampleSlug }),
      Newsletter: () => newsletterRouter(),
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
        yield* Effect.tryPromise(() =>
          page.addInitScript(
            'Object.defineProperty(window, "__FOLDKIT_PRERENDER__", { value: true, writable: false })',
          ),
        )
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
      const injectedHtml = injectHtml(baseHtml, renderedHtml)
      const outputHtml = injectMetaTags(injectedHtml, route, urlPath)

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

    yield* generateOgImages(routes, routeToUrlPath, DIST_DIR)

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
