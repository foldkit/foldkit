import { NodeRuntime, NodeServices } from '@effect/platform-node'
import {
  Array,
  Console,
  DateTime,
  Deferred,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String as Str,
  Stream,
  pipe,
} from 'effect'
import { FileSystem } from 'effect'
import { ChildProcess } from 'effect/unstable/process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium } from 'playwright'

import {
  moduleNameToSlug,
  parseTypedocJson,
} from '../src/page/apiReference/domain'
import { TypeDocJson } from '../src/page/apiReference/typedoc'
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
  CoreCanvasRoute,
  CoreCommandsRoute,
  CoreCounterExampleRoute,
  CoreCrashViewRoute,
  CoreCustomElementRoute,
  CoreDevToolsRoute,
  CoreDomRoute,
  CoreFileRoute,
  CoreFreezeModelRoute,
  CoreInitAndFlagsRoute,
  CoreManagedResourcesRoute,
  CoreMessagesRoute,
  CoreModelRoute,
  CoreMountRoute,
  CoreRenderRoute,
  CoreResourcesRoute,
  CoreRuntimeRoute,
  CoreSlowViewRoute,
  CoreSubmodelRoute,
  CoreSubscriptionsRoute,
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
  PatternsInformingSubmodelsRoute,
  PatternsSubscriptionOrganizationRoute,
  ProjectOrganizationRoute,
  ReactComparisonRoute,
  RoutingAndNavigationRoute,
  TestingRoute,
  TestingSceneRoute,
  TestingStoryRoute,
  TypingTerminalRoute,
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
  UiSelectionSubmodelsRoute,
  UiSliderRoute,
  UiSwitchRoute,
  UiTabsRoute,
  UiTextareaRoute,
  UiToastRoute,
  UiTooltipRoute,
  UiVirtualListRoute,
  WhatAboutSsrRoute,
  WhyNoJsxRoute,
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
  coreCanvasRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreCustomElementRouter,
  coreDevToolsRouter,
  coreDomRouter,
  coreFileRouter,
  coreFreezeModelRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreMountRouter,
  coreRenderRouter,
  coreResourcesRouter,
  coreRuntimeRouter,
  coreSlowViewRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
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
  patternsInformingSubmodelsRouter,
  patternsSubscriptionOrganizationRouter,
  playgroundRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  typingTerminalRouter,
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
  uiSelectionSubmodelsRouter,
  uiSliderRouter,
  uiSwitchRouter,
  uiTabsRouter,
  uiTextareaRouter,
  uiToastRouter,
  uiTooltipRouter,
  uiVirtualListRouter,
  whatAboutSsrRouter,
  whyNoJsxRouter,
} from '../src/route'
import {
  type LlmsFullEntry,
  type LlmsIndexEntry,
  buildLlmsFull,
  buildLlmsIndex,
  extractPageMarkdown,
  shouldExportMarkdown,
  urlPathToMarkdownPath,
} from './markdown'
import { routeToMetadata } from './metadata'
import { generateOgImages, injectMetaTags } from './og-image'

// ROUTES

export const STATIC_ROUTES: ReadonlyArray<AppRoute> = [
  HomeRoute(),
  NewsletterRoute(),
  ManifestoRoute(),
  WhyNoJsxRoute(),
  WhatAboutSsrRoute(),
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
  TypingTerminalRoute(),
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
  CoreMountRoute(),
  CoreCustomElementRoute(),
  CoreSubscriptionsRoute(),
  CoreInitAndFlagsRoute(),
  CoreDomRoute(),
  CoreRenderRoute(),
  CoreFileRoute(),
  CoreCanvasRoute(),
  CoreRuntimeRoute(),
  CoreResourcesRoute(),
  CoreManagedResourcesRoute(),
  CoreDevToolsRoute(),
  CoreCrashViewRoute(),
  CoreSlowViewRoute(),
  CoreFreezeModelRoute(),
  CoreSubmodelRoute(),
  PatternsInformingSubmodelsRoute(),
  PatternsSubscriptionOrganizationRoute(),
  CoreViewMemoizationRoute(),
  UiOverviewRoute(),
  UiSelectionSubmodelsRoute(),
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
      WhyNoJsx: () => whyNoJsxRouter(),
      WhatAboutSsr: () => whatAboutSsrRouter(),
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
      TypingTerminal: () => typingTerminalRouter(),
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
      CoreMount: () => coreMountRouter(),
      CoreCustomElement: () => coreCustomElementRouter(),
      CoreSubscriptions: () => coreSubscriptionsRouter(),
      CoreInitAndFlags: () => coreInitAndFlagsRouter(),
      CoreDom: () => coreDomRouter(),
      CoreRender: () => coreRenderRouter(),
      CoreFile: () => coreFileRouter(),
      CoreCanvas: () => coreCanvasRouter(),
      CoreRuntime: () => coreRuntimeRouter(),
      CoreResources: () => coreResourcesRouter(),
      CoreManagedResources: () => coreManagedResourcesRouter(),
      CoreDevTools: () => coreDevToolsRouter(),
      CoreCrashView: () => coreCrashViewRouter(),
      CoreSlowView: () => coreSlowViewRouter(),
      CoreFreezeModel: () => coreFreezeModelRouter(),
      CoreSubmodel: () => coreSubmodelRouter(),
      PatternsInformingSubmodels: () => patternsInformingSubmodelsRouter(),
      PatternsSubscriptionOrganization: () =>
        patternsSubscriptionOrganizationRouter(),
      CoreViewMemoization: () => coreViewMemoizationRouter(),
      UiOverview: () => uiOverviewRouter(),
      UiSelectionSubmodels: () => uiSelectionSubmodelsRouter(),
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

// PLAYGROUND SHELL

// NOTE: Playground routes are deliberately excluded from STATIC_ROUTES: the
// WebContainer editor can't be statically rendered, and every entry into it is
// a full document load for cross-origin isolation. With no file of its own,
// Vercel's SPA catch-all serves the prerendered home page for
// `/playground/<slug>`, so the landing view flashes before the app boots and
// swaps in the editor. We prerender this neutral shell once and route
// `/playground/*` to it instead (see deploy-website.yml and the preview
// fallback in vite.config.ts). The markup mirrors the booting spinner in
// `src/page/playground.ts`; every class here must already appear in app source
// because Tailwind scans source, not this injected string.
const PLAYGROUND_SHELL_MARKUP = `<div class="flex flex-col h-screen bg-white dark:bg-gray-900"><div class="flex-1 flex items-center justify-center px-6 py-20 text-center"><div class="max-w-sm flex flex-col items-center"><div class="w-8 h-8 mb-6 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-gray-100 animate-spin" role="status" aria-label="Loading"></div><div class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Starting playground…</div><div class="text-sm text-gray-600 dark:text-gray-400">Hang tight. The preview will appear automatically. First load takes about 30 seconds.</div></div></div></div>`

const PLAYGROUND_SHELL_OUTPUT_PATH = 'playground/index.html'

export const buildPlaygroundShellHtml = (baseHtml: string): string =>
  injectHtml(baseHtml, PLAYGROUND_SHELL_MARKUP)

export const enumerateRoutes = (
  apiModuleSlugs: ReadonlyArray<string>,
): ReadonlyArray<AppRoute> =>
  pipe(
    STATIC_ROUTES,
    Array.appendAll(
      Array.map(apiModuleSlugs, moduleSlug => ApiModuleRoute({ moduleSlug })),
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
    const cmd = ChildProcess.make(
      'pnpm',
      [
        'exec',
        'vite',
        'preview',
        '--port',
        String(PREVIEW_PORT),
        '--strictPort',
      ],
      { cwd: WEBSITE_DIR },
    )

    const serverProcess = yield* cmd
    const ready = yield* Deferred.make<void>()

    const checkLine = (line: string): Effect.Effect<void> =>
      line.includes('localhost')
        ? Deferred.succeed(ready, undefined).pipe(Effect.asVoid)
        : Effect.void

    yield* serverProcess.stdout.pipe(
      Stream.decodeText({ encoding: 'utf-8' }),
      Stream.splitLines,
      Stream.runForEach(checkLine),
      Effect.forkDetach,
    )

    yield* Deferred.await(ready)
    return serverProcess
  }),
  serverProcess => Effect.ignore(serverProcess.kill()),
).pipe(Effect.asVoid)

const playwrightBrowserResource = Effect.acquireRelease(
  Effect.tryPromise(() => chromium.launch({ headless: true })),
  browser => Effect.promise(() => browser.close()),
)

type CapturedPage = Readonly<{ html: string; markdown: string }>

// NOTE: tsx/esbuild wraps named arrow functions with a `__name(fn, "name")`
// helper to preserve debug names. When Playwright ships our extraction
// function to the page via `fn.toString()`, the body still references
// `__name`, which doesn't exist in browser scope. The no-op polyfill keeps
// `page.evaluate` calls from crashing without touching the foldkit bundle
// (Vite scopes its own `__name` per module, so the global shim is never
// reached by app code).
const PAGE_INIT_SCRIPT = `
  Object.defineProperty(window, "__FOLDKIT_PRERENDER__", {
    value: true,
    writable: false,
  });
  window.__name = (target) => target;
`

const captureRoutePage = (browser: Browser, url: string, route: AppRoute) =>
  Effect.acquireUseRelease(
    Effect.tryPromise(() => browser.newPage()),
    page =>
      Effect.gen(function* () {
        yield* Effect.tryPromise(() => page.addInitScript(PAGE_INIT_SCRIPT))
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
        if (route._tag === 'ApiModule') {
          yield* Effect.tryPromise(() =>
            page.waitForSelector('h1[data-pagefind-meta="section"]'),
          )
        }
        const html = yield* Effect.tryPromise(() =>
          page.evaluate(() => document.body.firstElementChild?.outerHTML ?? ''),
        )
        const markdown = shouldExportMarkdown(route)
          ? yield* extractPageMarkdown(page)
          : ''
        const captured: CapturedPage = { html, markdown }
        return captured
      }),
    page => Effect.promise(() => page.close()),
  )

// PRERENDER

const ApiDocJson = S.fromJsonString(TypeDocJson)

const readApiModuleSlugs = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const raw = yield* fs.readFileString(API_JSON_PATH)
  const apiDoc = yield* S.decodeUnknownEffect(ApiDocJson)(raw)
  return Array.map(parseTypedocJson(apiDoc).modules, ({ name }) =>
    moduleNameToSlug(name),
  )
})

type PrerenderResult = Readonly<{
  route: AppRoute
  urlPath: string
  markdown: string
}>

const prerenderRoute =
  (browser: Browser, baseHtml: string) => (route: AppRoute) =>
    Effect.gen(function* () {
      const urlPath = routeToUrlPath(route)
      const outputPath = routeToOutputPath(route)
      const url = `${PREVIEW_BASE_URL}${urlPath}`
      const outputFilePath = resolve(DIST_DIR, outputPath)

      const captured = yield* captureRoutePage(browser, url, route)
      const injectedHtml = injectHtml(baseHtml, captured.html)
      const outputHtml = injectMetaTags(injectedHtml, route, urlPath)

      const fs = yield* FileSystem.FileSystem
      yield* fs.makeDirectory(dirname(outputFilePath), {
        recursive: true,
      })
      yield* fs.writeFileString(outputFilePath, outputHtml)

      if (shouldExportMarkdown(route) && captured.markdown.length > 0) {
        const markdownFilePath = resolve(
          DIST_DIR,
          urlPathToMarkdownPath(urlPath),
        )
        yield* fs.makeDirectory(dirname(markdownFilePath), {
          recursive: true,
        })
        yield* fs.writeFileString(markdownFilePath, captured.markdown)
      }

      yield* Console.log(`  ✓ ${urlPath}`)
      return Option.some<PrerenderResult>({
        route,
        urlPath,
        markdown: captured.markdown,
      })
    }).pipe(
      Effect.catch(error =>
        Effect.as(
          Console.warn(`  ✗ ${routeToUrlPath(route)}: ${String(error)}`),
          Option.none<PrerenderResult>(),
        ),
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

const resultToIndexEntry = (result: PrerenderResult): LlmsIndexEntry => ({
  urlPath: result.urlPath,
  metadata: routeToMetadata(result.route),
})

const resultToFullEntry = (
  result: PrerenderResult,
  orderIndex: number,
): LlmsFullEntry => ({
  urlPath: result.urlPath,
  metadata: routeToMetadata(result.route),
  markdown: result.markdown,
  orderIndex,
})

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Console.log('Starting prerender...')

    yield* previewServerResource
    const browser = yield* playwrightBrowserResource

    const apiModuleSlugs = yield* readApiModuleSlugs
    const routes = enumerateRoutes(apiModuleSlugs)

    yield* generateOgImages(routes, routeToUrlPath, DIST_DIR)

    const fs = yield* FileSystem.FileSystem
    const baseHtml = yield* fs.readFileString(resolve(DIST_DIR, 'index.html'))

    const playgroundShellPath = resolve(DIST_DIR, PLAYGROUND_SHELL_OUTPUT_PATH)
    yield* fs.makeDirectory(dirname(playgroundShellPath), { recursive: true })
    yield* fs.writeFileString(
      playgroundShellPath,
      buildPlaygroundShellHtml(baseHtml),
    )
    yield* Console.log('  ✓ /playground/* shell')

    const results = yield* Effect.forEach(
      routes,
      prerenderRoute(browser, baseHtml),
      { concurrency: 4 },
    )

    const successfulResults = Array.getSomes(results)
    const markdownResults = Array.filter(
      successfulResults,
      result => result.markdown.length > 0,
    )

    const lastModification = formatDateIso(yield* DateTime.now)
    yield* fs.writeFileString(
      resolve(DIST_DIR, 'sitemap.xml'),
      buildSitemap(routes, lastModification),
    )

    const indexEntries = Array.map(markdownResults, resultToIndexEntry)
    const fullEntries = Array.map(markdownResults, resultToFullEntry)

    yield* fs.writeFileString(
      resolve(DIST_DIR, 'llms.txt'),
      buildLlmsIndex(indexEntries),
    )
    yield* fs.writeFileString(
      resolve(DIST_DIR, 'llms-full.txt'),
      buildLlmsFull(fullEntries, lastModification),
    )

    yield* Console.log(
      `Prerendered ${routes.length} routes; emitted ${markdownResults.length} markdown pages.`,
    )
  }),
)

if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)))
}
