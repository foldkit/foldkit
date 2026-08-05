import {
  Array,
  Console,
  DateTime,
  Effect,
  Match as M,
  Option,
  Record,
  Schema as S,
  String as Str,
  pipe,
} from 'effect'
import { FileSystem } from 'effect'
import * as Server from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { NodeRuntime, NodeServices } from '@effect/platform-node'

import type * as ServerEntry from '../src/entry.server'
import {
  type ApiModule,
  moduleNameToSlug,
  parseTypedocJson,
  slugToModuleName,
} from '../src/page/apiReference/domain'
import { TypeDocJson } from '../src/page/apiReference/typedoc'
import { exampleSlugs } from '../src/page/example/meta'
import {
  AiMcpRoute,
  AiOverviewRoute,
  AiSkillsRoute,
  ApiModuleRoute,
  AppRoute,
  AsyncDataRoute,
  BestPracticesImmutabilityRoute,
  BestPracticesKeyingRoute,
  BestPracticesMessagesRoute,
  BestPracticesSideEffectsRoute,
  ComingFromReactRoute,
  ComingFromTanStackQueryRoute,
  CoreArchitectureRoute,
  CoreCanvasRoute,
  CoreCommandsRoute,
  CoreCounterExampleRoute,
  CoreCrashViewRoute,
  CoreCustomElementRoute,
  CoreDevToolsRoute,
  CoreDomRoute,
  CoreEmbeddingRoute,
  CoreFileRoute,
  CoreFreezeModelRoute,
  CoreHttpRoute,
  CoreInitAndFlagsRoute,
  CoreManagedResourcesRoute,
  CoreMessagesRoute,
  CoreModelRoute,
  CoreMountRoute,
  CorePreserveScrollRoute,
  CoreRenderRoute,
  CoreResourcesRoute,
  CoreRuntimeRoute,
  CoreServerRenderingRoute,
  CoreSlowWarningsRoute,
  CoreSubmodelRoute,
  CoreSubscriptionsRoute,
  CoreUpdateRoute,
  CoreViewMemoizationRoute,
  CoreViewRoute,
  CoreViewTransitionsRoute,
  EffectAtomComparisonRoute,
  ElmComparisonRoute,
  ExampleDetailRoute,
  ExamplesRoute,
  FieldValidationRoute,
  GettingStartedRoute,
  HomeRoute,
  ManifestoRoute,
  NewsletterRoute,
  PatternsInformingSubmodelsRoute,
  PatternsSubscriptionOrganizationRoute,
  PerformanceRoute,
  ProjectOrganizationRoute,
  ReactComparisonRoute,
  RoadmapRoute,
  RoutingAndNavigationRoute,
  TestingRoute,
  TestingSceneRoute,
  TestingStoryRoute,
  ToolingLintingRoute,
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
  UiNavRoute,
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
  asyncDataRouter,
  bestPracticesImmutabilityRouter,
  bestPracticesKeyingRouter,
  bestPracticesMessagesRouter,
  bestPracticesSideEffectsRouter,
  comingFromReactRouter,
  comingFromTanStackQueryRouter,
  coreArchitectureRouter,
  coreCanvasRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreCustomElementRouter,
  coreDevToolsRouter,
  coreDomRouter,
  coreEmbeddingRouter,
  coreFileRouter,
  coreFreezeModelRouter,
  coreHttpRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreMountRouter,
  corePreserveScrollRouter,
  coreRenderRouter,
  coreResourcesRouter,
  coreRuntimeRouter,
  coreServerRenderingRouter,
  coreSlowWarningsRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  coreViewTransitionsRouter,
  effectAtomComparisonRouter,
  elmComparisonRouter,
  exampleDetailRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  homeRouter,
  manifestoRouter,
  newsletterRouter,
  patternsInformingSubmodelsRouter,
  patternsSubscriptionOrganizationRouter,
  performanceRouter,
  playgroundRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  roadmapRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  toolingLintingRouter,
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
  uiNavRouter,
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
  extractMarkdownFromRenderedDocument,
  shouldExportMarkdown,
  urlPathToMarkdownPath,
} from './markdown'
import { type ApiModuleNameResolver, routeToMetadata } from './metadata'
import { generateOgImages, injectMetaTags } from './og-image'

// ROUTES

export const STATIC_ROUTES: ReadonlyArray<AppRoute> = [
  HomeRoute(),
  NewsletterRoute(),
  ManifestoRoute(),
  WhyNoJsxRoute(),
  WhatAboutSsrRoute(),
  PerformanceRoute(),
  GettingStartedRoute(),
  RoadmapRoute(),
  ComingFromReactRoute(),
  ComingFromTanStackQueryRoute(),
  ReactComparisonRoute(),
  EffectAtomComparisonRoute(),
  ElmComparisonRoute(),
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
  ToolingLintingRoute(),
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
  CoreHttpRoute(),
  CoreCanvasRoute(),
  CoreRuntimeRoute(),
  CoreServerRenderingRoute(),
  CoreResourcesRoute(),
  CoreManagedResourcesRoute(),
  CoreDevToolsRoute(),
  CoreCrashViewRoute(),
  CoreViewTransitionsRoute(),
  CoreSlowWarningsRoute(),
  CoreFreezeModelRoute(),
  CorePreserveScrollRoute(),
  CoreSubmodelRoute(),
  AsyncDataRoute(),
  PatternsInformingSubmodelsRoute(),
  PatternsSubscriptionOrganizationRoute(),
  CoreViewMemoizationRoute(),
  CoreEmbeddingRoute(),
  UiOverviewRoute(),
  UiSelectionSubmodelsRoute(),
  UiTabsRoute(),
  UiNavRoute(),
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
      Performance: () => performanceRouter(),
      GettingStarted: () => gettingStartedRouter(),
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
      CoreCanvas: () => coreCanvasRouter(),
      CoreRuntime: () => coreRuntimeRouter(),
      CoreServerRendering: () => coreServerRenderingRouter(),
      CoreResources: () => coreResourcesRouter(),
      CoreManagedResources: () => coreManagedResourcesRouter(),
      CoreDevTools: () => coreDevToolsRouter(),
      CoreCrashView: () => coreCrashViewRouter(),
      CoreViewTransitions: () => coreViewTransitionsRouter(),
      CoreSlowWarnings: () => coreSlowWarningsRouter(),
      CoreFreezeModel: () => coreFreezeModelRouter(),
      CorePreserveScroll: () => corePreserveScrollRouter(),
      CoreSubmodel: () => coreSubmodelRouter(),
      AsyncData: () => asyncDataRouter(),
      PatternsInformingSubmodels: () => patternsInformingSubmodelsRouter(),
      PatternsSubscriptionOrganization: () =>
        patternsSubscriptionOrganizationRouter(),
      CoreViewMemoization: () => coreViewMemoizationRouter(),
      CoreEmbedding: () => coreEmbeddingRouter(),
      UiOverview: () => uiOverviewRouter(),
      UiSelectionSubmodels: () => uiSelectionSubmodelsRouter(),
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

// NOTE: the replacement is a function so `$` sequences in rendered markup
// (code snippets routinely contain `$&`, `$'`, and the like) are inserted
// verbatim. A string second argument to `String.replace` would treat them as
// match-insertion patterns and corrupt the page.
export const injectHtml = (baseHtml: string, renderedHtml: string): string =>
  baseHtml.replace(
    ROOT_PLACEHOLDER,
    () => `<div id="root">${renderedHtml}</div>`,
  )

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
const API_UI_JSON_PATH = resolve(WEBSITE_DIR, 'src/generated/api-ui.json')

// SERVER ENTRY

const SERVER_ENTRY_PATH = resolve(WEBSITE_DIR, 'dist-server/entry.server.js')

// NOTE: the app module graph uses Vite-only specifiers (`virtual:*`, `.md`,
// `?raw`, `import.meta.glob`), so it cannot be imported by tsx directly. The
// `preprerender` script builds `src/entry.server.ts` with `vite build --ssr`
// first, and this dynamic import loads that bundle.
const loadServerEntry: Effect.Effect<typeof ServerEntry> = Effect.promise(
  () => import(pathToFileURL(SERVER_ENTRY_PATH).href),
)

type RenderedPage = Readonly<{
  application: Server.RenderedApplication
  markdown: string
}>

const API_SECTION_MARKER = 'data-pagefind-meta="section"'

const extractMarkdownFromHtml = (html: string): Effect.Effect<string> =>
  Effect.acquireUseRelease(
    Effect.sync(() => new Window()),
    window =>
      Effect.sync(() => {
        window.document.body.innerHTML = html
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const renderedDocument = window.document as unknown as Document
        return extractMarkdownFromRenderedDocument(renderedDocument)
      }),
    window => Effect.promise(() => window.happyDOM.close()),
  )

const renderRoutePage = (serverEntry: typeof ServerEntry, route: AppRoute) =>
  Effect.gen(function* () {
    const urlPath = routeToUrlPath(route)
    const result = yield* Effect.promise(() =>
      serverEntry.renderPage(new Request(`${SITE_URL}${urlPath}`)),
    )
    if (result._tag === 'Responded') {
      return yield* Effect.fail(
        new Error(
          `The server entry returned a complete Response while prerendering ${urlPath}; static HTML generation requires a Rendered result.`,
        ),
      )
    }
    if (result.status !== undefined && result.status !== 200) {
      return yield* Effect.fail(
        new Error(
          `The server entry returned status ${result.status} while prerendering ${urlPath}; the static host cannot preserve that status in an HTML file.`,
        ),
      )
    }
    if (result.headers !== undefined) {
      return yield* Effect.fail(
        new Error(
          `The server entry returned response headers while prerendering ${urlPath}; the static host cannot preserve them in an HTML file.`,
        ),
      )
    }
    const rendered = result.application

    if (
      route._tag === 'ApiModule' &&
      !rendered.html.includes(API_SECTION_MARKER)
    ) {
      return yield* Effect.fail(
        new Error(
          `API module page ${urlPath} rendered without its section heading; ` +
            'the API data seeding in entry.server.ts has regressed.',
        ),
      )
    }

    const markdown = shouldExportMarkdown(route)
      ? yield* extractMarkdownFromHtml(rendered.html)
      : ''
    const renderedPage: RenderedPage = {
      application: rendered,
      markdown,
    }
    return renderedPage
  })

// PRERENDER

const ApiDocJson = S.fromJsonString(TypeDocJson)

// NOTE: The core and UI TypeDoc projects are merged here the same way
// vite.config.ts merges them for the client. Reading only api.json drops every
// Ui/* module, and with it every `ui-*` route from prerender, the sitemap, the
// Pagefind index, and per-page metadata.
const readApiModules = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const [coreRaw, uiRaw] = yield* Effect.all([
    fs.readFileString(API_JSON_PATH),
    fs.readFileString(API_UI_JSON_PATH),
  ])
  const coreApiDoc = yield* S.decodeUnknownEffect(ApiDocJson)(coreRaw)
  const uiApiDoc = yield* S.decodeUnknownEffect(ApiDocJson)(uiRaw)

  return parseTypedocJson({
    ...coreApiDoc,
    children: [...coreApiDoc.children, ...uiApiDoc.children],
  }).modules
})

type PrerenderResult = Readonly<{
  route: AppRoute
  urlPath: string
  markdown: string
}>

const buildApiModuleNameResolver = (
  modules: ReadonlyArray<ApiModule>,
): ApiModuleNameResolver => {
  const nameBySlug = Record.fromIterableWith(modules, ({ name }) => [
    moduleNameToSlug(name),
    name,
  ])
  return slug =>
    pipe(
      nameBySlug,
      Record.get(slug),
      Option.getOrElse(() => slugToModuleName(slug)),
    )
}

const prerenderRoute =
  (
    serverEntry: typeof ServerEntry,
    baseHtml: string,
    resolveApiModuleName: ApiModuleNameResolver,
  ) =>
  (route: AppRoute) =>
    Effect.gen(function* () {
      const urlPath = routeToUrlPath(route)
      const outputPath = routeToOutputPath(route)
      const outputFilePath = resolve(DIST_DIR, outputPath)

      const captured = yield* renderRoutePage(serverEntry, route)
      const injectedHtml = Server.injectIntoTemplate(
        baseHtml,
        captured.application,
      )
      const outputHtml = injectMetaTags(
        injectedHtml,
        route,
        urlPath,
        resolveApiModuleName,
      )

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

const resultToIndexEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult): LlmsIndexEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
  })

const resultToFullEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult, orderIndex: number): LlmsFullEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
    markdown: result.markdown,
    orderIndex,
  })

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Console.log('Starting prerender...')

    const serverEntry = yield* loadServerEntry

    const apiModules = yield* readApiModules
    const apiModuleSlugs = Array.map(apiModules, ({ name }) =>
      moduleNameToSlug(name),
    )
    const resolveApiModuleName = buildApiModuleNameResolver(apiModules)
    const routes = enumerateRoutes(apiModuleSlugs)

    yield* generateOgImages(
      routes,
      routeToUrlPath,
      DIST_DIR,
      resolveApiModuleName,
    )

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
      prerenderRoute(serverEntry, baseHtml, resolveApiModuleName),
      { concurrency: 4 },
    )

    const successfulResults = Array.getSomes(results)
    const failedResults = Array.filter(results, Option.isNone)
    if (Array.isArrayNonEmpty(failedResults)) {
      return yield* Effect.die(
        new Error(
          `Failed to prerender ${failedResults.length} routes. See the errors above.`,
        ),
      )
    }
    const markdownResults = Array.filter(
      successfulResults,
      result => result.markdown.length > 0,
    )

    const lastModification = formatDateIso(yield* DateTime.now)
    yield* fs.writeFileString(
      resolve(DIST_DIR, 'sitemap.xml'),
      buildSitemap(routes, lastModification),
    )

    const indexEntries = Array.map(
      markdownResults,
      resultToIndexEntry(resolveApiModuleName),
    )
    const fullEntries = Array.map(
      markdownResults,
      resultToFullEntry(resolveApiModuleName),
    )

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
