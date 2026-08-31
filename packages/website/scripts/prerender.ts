import {
  Array,
  Console,
  DateTime,
  Effect,
  Match,
  Option,
  Record,
  Schema,
  String,
  pipe,
} from 'effect'
import { FileSystem } from 'effect'
import type { PlatformError } from 'effect/PlatformError'
import { Server } from 'foldkit/experimental'
import { Window } from 'happy-dom'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

import { NodeRuntime, NodeServices } from '@effect/platform-node'

import type * as ServerEntry from '../src/entry.server'
import {
  type ApiModule,
  moduleNameToSlug,
  parseTypedocJson,
  slugToModuleName,
} from '../src/page/apiReference/domain'
import { TypeDocJson } from '../src/page/apiReference/typedoc'
import { BLOG_DESCRIPTION, BLOG_RSS_PATH } from '../src/page/blog/meta'
import { exampleSlugs, examples } from '../src/page/example/meta'
import {
  AppRoute,
  aboutRouter,
  aiMcpRouter,
  aiOverviewRouter,
  aiSkillsRouter,
  apiModuleRouter,
  asyncDataRouter,
  bestPracticesImmutabilityRouter,
  bestPracticesKeyingRouter,
  bestPracticesMessagesRouter,
  bestPracticesSideEffectsRouter,
  blogPostRouter,
  blogRouter,
  comingFromReactRouter,
  comingFromTanStackQueryRouter,
  contactRouter,
  contentApiRouter,
  coreArchitectureRouter,
  coreCanvasRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreCustomElementRouter,
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
  devToolsOverviewRouter,
  devToolsReRenderOutlinesRouter,
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
  privacyRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  roadmapRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  toolingLintingRouter,
  typingTerminalRouter,
  uiAnchorRouter,
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
  uiHoverIntentRouter,
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
  whyNoJsxRouter,
} from '../src/route'
import { type BlogPostEntry, blogPostSlugs, blogPosts } from './blogPosts'
import {
  API_BASE_PATH,
  type ApiPageEntry,
  contentApiDocuments,
} from './contentApi'
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
  AppRoute.Home(),
  AppRoute.Newsletter(),
  AppRoute.Manifesto(),
  AppRoute.WhyNoJsx(),
  AppRoute.Performance(),
  AppRoute.GettingStarted(),
  AppRoute.Roadmap(),
  AppRoute.ComingFromReact(),
  AppRoute.ComingFromTanStackQuery(),
  AppRoute.ReactComparison(),
  AppRoute.EffectAtomComparison(),
  AppRoute.ElmComparison(),
  AppRoute.RoutingAndNavigation(),
  AppRoute.FieldValidation(),
  AppRoute.Testing(),
  AppRoute.TestingStory(),
  AppRoute.TestingScene(),
  AppRoute.Examples(),
  ...Array.map(exampleSlugs, slug =>
    AppRoute.ExampleDetail({ exampleSlug: slug }),
  ),
  AppRoute.TypingTerminal(),
  AppRoute.BestPracticesSideEffects(),
  AppRoute.BestPracticesMessages(),
  AppRoute.BestPracticesKeying(),
  AppRoute.BestPracticesImmutability(),
  AppRoute.ProjectOrganization(),
  AppRoute.ToolingLinting(),
  AppRoute.CoreArchitecture(),
  AppRoute.CoreCounterExample(),
  AppRoute.CoreModel(),
  AppRoute.CoreMessages(),
  AppRoute.CoreUpdate(),
  AppRoute.CoreView(),
  AppRoute.CoreCommands(),
  AppRoute.CoreMount(),
  AppRoute.CoreCustomElement(),
  AppRoute.CoreSubscriptions(),
  AppRoute.CoreInitAndFlags(),
  AppRoute.CoreDom(),
  AppRoute.CoreRender(),
  AppRoute.CoreFile(),
  AppRoute.CoreHttp(),
  AppRoute.CoreCanvas(),
  AppRoute.CoreRuntime(),
  AppRoute.CoreServerRendering(),
  AppRoute.CoreResources(),
  AppRoute.CoreManagedResources(),
  AppRoute.DevToolsOverview(),
  AppRoute.DevToolsReRenderOutlines(),
  AppRoute.CoreCrashView(),
  AppRoute.CoreViewTransitions(),
  AppRoute.CoreSlowWarnings(),
  AppRoute.CoreFreezeModel(),
  AppRoute.CorePreserveScroll(),
  AppRoute.CoreSubmodel(),
  AppRoute.AsyncData(),
  AppRoute.PatternsInformingSubmodels(),
  AppRoute.PatternsSubscriptionOrganization(),
  AppRoute.CoreViewMemoization(),
  AppRoute.CoreEmbedding(),
  AppRoute.UiOverview(),
  AppRoute.UiSelectionSubmodels(),
  AppRoute.UiTabs(),
  AppRoute.UiNav(),
  AppRoute.UiDisclosure(),
  AppRoute.UiDialog(),
  AppRoute.UiMenu(),
  AppRoute.UiPopover(),
  AppRoute.UiListbox(),
  AppRoute.UiRadioGroup(),
  AppRoute.UiSelect(),
  AppRoute.UiSlider(),
  AppRoute.UiSwitch(),
  AppRoute.UiButton(),
  AppRoute.UiCalendar(),
  AppRoute.UiDatePicker(),
  AppRoute.UiCheckbox(),
  AppRoute.UiCombobox(),
  AppRoute.UiInput(),
  AppRoute.UiTextarea(),
  AppRoute.UiFieldset(),
  AppRoute.UiDragAndDrop(),
  AppRoute.UiFileDrop(),
  AppRoute.UiHoverIntent(),
  AppRoute.UiToast(),
  AppRoute.UiTooltip(),
  AppRoute.UiAnimation(),
  AppRoute.UiAnchor(),
  AppRoute.UiVirtualList(),
  AppRoute.AiOverview(),
  AppRoute.AiSkills(),
  AppRoute.AiMcp(),
  AppRoute.ContentApi(),
  AppRoute.About(),
  AppRoute.Contact(),
  AppRoute.Privacy(),
  AppRoute.Blog(),
  ...Array.map(blogPostSlugs, slug => AppRoute.BlogPost({ postSlug: slug })),
]

const PLAYGROUND_ROUTES: ReadonlyArray<AppRoute> = Array.map(
  exampleSlugs,
  exampleSlug => AppRoute.Playground({ exampleSlug }),
)

export const routeToUrlPath = (route: AppRoute): string =>
  AppRoute.match<string>(route, {
    Home: () => homeRouter(),
    Manifesto: () => manifestoRouter(),
    WhyNoJsx: () => whyNoJsxRouter(),
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
    DevToolsOverview: () => devToolsOverviewRouter(),
    DevToolsReRenderOutlines: () => devToolsReRenderOutlinesRouter(),
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
    UiHoverIntent: () => uiHoverIntentRouter(),
    UiToast: () => uiToastRouter(),
    UiTooltip: () => uiTooltipRouter(),
    UiAnimation: () => uiAnimationRouter(),
    UiAnchor: () => uiAnchorRouter(),
    UiVirtualList: () => uiVirtualListRouter(),
    AiOverview: () => aiOverviewRouter(),
    AiSkills: () => aiSkillsRouter(),
    AiMcp: () => aiMcpRouter(),
    ApiModule: ({ moduleSlug }) => apiModuleRouter({ moduleSlug }),
    ContentApi: () => contentApiRouter(),
    About: () => aboutRouter(),
    Contact: () => contactRouter(),
    Privacy: () => privacyRouter(),
    Playground: ({ exampleSlug }) => playgroundRouter({ exampleSlug }),
    Newsletter: () => newsletterRouter(),
    Blog: () => blogRouter(),
    BlogPost: ({ postSlug }) => blogPostRouter({ postSlug }),
    NotFound: ({ path }) => path,
  })

export const INDEX_OUTPUT_PATH = 'index.html'

export const routeToOutputPath = (route: AppRoute): string => {
  const urlPath = routeToUrlPath(route)
  return urlPath === '/'
    ? INDEX_OUTPUT_PATH
    : `${urlPath.slice(1)}/${INDEX_OUTPUT_PATH}`
}

export const enumerateRoutes = (
  apiModuleSlugs: ReadonlyArray<string>,
): ReadonlyArray<AppRoute> =>
  pipe(
    STATIC_ROUTES,
    Array.appendAll(
      Array.map(apiModuleSlugs, moduleSlug =>
        AppRoute.ApiModule({ moduleSlug }),
      ),
    ),
  )

// PATHS

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEBSITE_DIR = resolve(SCRIPT_DIR, '..')
const DIST_DIR = resolve(WEBSITE_DIR, 'dist')
const API_JSON_PATH = resolve(WEBSITE_DIR, 'src/generated/api.json')
const API_UI_JSON_PATH = resolve(WEBSITE_DIR, 'src/generated/api-ui.json')
const INDEX_PATH = resolve(DIST_DIR, INDEX_OUTPUT_PATH)
const TEMPLATE_COPY_PATH = resolve(
  WEBSITE_DIR,
  'node_modules/.cache/foldkit/prerender-template.html',
)
const CONTAINER_ID = 'root'
const CONTAINER_PLACEHOLDER = `<div id="${CONTAINER_ID}"></div>`

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

const ApiDocJson = Schema.fromJsonString(TypeDocJson)

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
  const coreApiDoc = yield* Schema.decodeUnknownEffect(ApiDocJson)(coreRaw)
  const uiApiDoc = yield* Schema.decodeUnknownEffect(ApiDocJson)(uiRaw)

  return parseTypedocJson({
    ...coreApiDoc,
    children: [...coreApiDoc.children, ...uiApiDoc.children],
  }).modules
})

type PrerenderResult = Readonly<{
  route: AppRoute
  urlPath: string
  markdown: string
  html: string
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
        { containerId: CONTAINER_ID },
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
        html: captured.application.html,
      })
    }).pipe(
      Effect.catch(error =>
        Effect.as(
          Console.warn(
            `  ✗ ${routeToUrlPath(route)}: ${globalThis.String(error)}`,
          ),
          Option.none<PrerenderResult>(),
        ),
      ),
    )

// PLAYGROUND SHELLS

// NOTE: Playground routes are deliberately excluded from STATIC_ROUTES: the
// WebContainer editor can't be statically rendered per slug, and every entry
// into it is a full document load for cross-origin isolation. A single Counter
// render supplies the app shell and Flags payload that `Runtime.hydrate`
// requires. Each known slug gets a copy with its own metadata, so direct loads
// and link previews describe the requested example. Hydrating another example
// against the Counter shell rebuilds the mismatching subtree, the designed
// hydration fallback. The canonical Counter copy at `/playground/index.html`
// remains the fallback for unknown slugs (see deploy-website.yml and the
// preview fallback in vite.config.ts).
const PLAYGROUND_SHELL_ROUTE = AppRoute.Playground({ exampleSlug: 'counter' })

const PLAYGROUND_SHELL_OUTPUT_PATH = 'playground/index.html'

const prerenderPlaygroundShells = (
  serverEntry: typeof ServerEntry,
  baseHtml: string,
  resolveApiModuleName: ApiModuleNameResolver,
) =>
  Effect.gen(function* () {
    const captured = yield* renderRoutePage(serverEntry, PLAYGROUND_SHELL_ROUTE)
    const shellHtml = Server.injectIntoTemplate(
      baseHtml,
      captured.application,
      { containerId: CONTAINER_ID },
    )

    const fs = yield* FileSystem.FileSystem
    const writeShell = (route: AppRoute, outputPath: string) => {
      const urlPath = routeToUrlPath(route)
      const outputHtml = injectMetaTags(
        shellHtml,
        route,
        urlPath,
        resolveApiModuleName,
      )
      const outputFilePath = resolve(DIST_DIR, outputPath)

      return Effect.gen(function* () {
        yield* fs.makeDirectory(dirname(outputFilePath), { recursive: true })
        yield* fs.writeFileString(outputFilePath, outputHtml)
      })
    }

    yield* writeShell(PLAYGROUND_SHELL_ROUTE, PLAYGROUND_SHELL_OUTPUT_PATH)
    yield* Effect.forEach(
      PLAYGROUND_ROUTES,
      route => writeShell(route, routeToOutputPath(route)),
      { concurrency: 4 },
    )

    yield* Console.log(
      `  ✓ ${PLAYGROUND_ROUTES.length} /playground/* metadata shells`,
    )
  })

// NOT FOUND PAGE

// NOTE: the static host serves this file with a real 404 status for every
// unknown path (see scripts/website-vercel-config.mjs). Without it, unknown
// paths answer 200 with the app shell and agents conclude every path exists.
export const NOT_FOUND_ROUTE = AppRoute.NotFound({ path: '/404' })

export const NOT_FOUND_OUTPUT_PATH = '404.html'

const prerenderNotFoundPage = (
  serverEntry: typeof ServerEntry,
  baseHtml: string,
  resolveApiModuleName: ApiModuleNameResolver,
) =>
  Effect.gen(function* () {
    const captured = yield* renderRoutePage(serverEntry, NOT_FOUND_ROUTE)
    const injectedHtml = Server.injectIntoTemplate(
      baseHtml,
      captured.application,
      { containerId: CONTAINER_ID },
    )
    const outputHtml = injectMetaTags(
      injectedHtml,
      NOT_FOUND_ROUTE,
      routeToUrlPath(NOT_FOUND_ROUTE),
      resolveApiModuleName,
    )

    const fs = yield* FileSystem.FileSystem
    yield* fs.writeFileString(
      resolve(DIST_DIR, NOT_FOUND_OUTPUT_PATH),
      outputHtml,
    )
    yield* Console.log(`  ✓ /${NOT_FOUND_OUTPUT_PATH}`)
  })

// SITEMAP

const SITE_URL = 'https://foldkit.dev'

const formatDateIso = (dateTime: DateTime.DateTime): string => {
  const { year, month, day } = DateTime.toPartsUtc(dateTime)
  return pipe(
    [globalThis.String(year), globalThis.String(month), globalThis.String(day)],
    Array.map(String.padStart(2, '0')),
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

// RSS

// NOTE: index.html advertises the feed with this same title on its
// `rel="alternate"` link, which is static HTML and cannot import it.
const RSS_FEED_TITLE = 'Foldkit Blog'

const escapeXml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

const toRfc822Date = (date: string): string =>
  Option.match(DateTime.make(date), {
    onNone: () => date,
    onSome: dateTime => DateTime.toDateUtc(dateTime).toUTCString(),
  })

/**
 * Extracts a prerendered blog post page's `article` element, the cover, the
 * header, and the rendered prose, leaving out the surrounding site chrome.
 */
export const extractPostArticleHtml = (
  pageHtml: string,
): Option.Option<string> =>
  pipe(
    String.indexOf('<article')(pageHtml),
    Option.flatMap(startIndex =>
      Option.map(String.indexOf('</article>')(pageHtml), endIndex =>
        pageHtml.slice(startIndex, endIndex + '</article>'.length),
      ),
    ),
  )

/**
 * Prepares an extracted article for the feed: root-relative links and image
 * sources become absolute, since feed readers resolve them against nothing,
 * and the back-to-blog link is dropped, since it only makes sense on the site.
 */
export const toFeedArticleHtml = (articleHtml: string): string =>
  articleHtml
    .replace(/<a[^>]*>←[^<]*<\/a>/, '')
    .replace(/(href|src)="\//g, `$1="${SITE_URL}/`)

const escapeCdataContent = (html: string): string =>
  html.replaceAll(']]>', ']]]]><![CDATA[>')

const maybeFeedArticleEntry = (
  result: PrerenderResult,
): Option.Option<readonly [string, string]> =>
  Match.value(result.route).pipe(
    Match.tag('BlogPost', ({ postSlug }) =>
      Option.map(
        extractPostArticleHtml(result.html),
        articleHtml => [postSlug, toFeedArticleHtml(articleHtml)] as const,
      ),
    ),
    Match.orElse(() => Option.none()),
  )

const blogPostRssItem = (
  entry: BlogPostEntry,
  maybeArticleHtml: Option.Option<string>,
): string => {
  const postUrl = `${SITE_URL}${blogPostRouter({ postSlug: entry.slug })}`
  const enclosure = Option.match(entry.maybeCoverAsset, {
    onNone: () => '',
    onSome: cover =>
      `\n  <enclosure url="${escapeXml(`${SITE_URL}${cover.src}`)}" length="${cover.byteLength}" type="${cover.mimeType}" />`,
  })
  const contentEncoded = Option.match(maybeArticleHtml, {
    onNone: () => '',
    onSome: articleHtml =>
      `\n  <content:encoded><![CDATA[${escapeCdataContent(articleHtml)}]]></content:encoded>`,
  })
  return `<item>
  <title>${escapeXml(entry.frontmatter.title)}</title>
  <link>${escapeXml(postUrl)}</link>
  <guid>${escapeXml(postUrl)}</guid>
  <description>${escapeXml(entry.frontmatter.description)}</description>
  <pubDate>${toRfc822Date(entry.frontmatter.date)}</pubDate>${enclosure}${contentEncoded}
</item>`
}

// NOTE: posts arrive newest first, so the newest post's date is the feed's last
// build date. Deriving it from the content rather than the clock keeps two
// builds of the same commit byte-identical.
const rssChannelHeader = (posts: ReadonlyArray<BlogPostEntry>): string => {
  const channel = `<title>${RSS_FEED_TITLE}</title>
<link>${SITE_URL}${blogRouter()}</link>
<atom:link href="${SITE_URL}${BLOG_RSS_PATH}" rel="self" type="application/rss+xml" />
<description>${escapeXml(BLOG_DESCRIPTION)}</description>`

  return Option.match(Array.head(posts), {
    onNone: () => channel,
    onSome: newest =>
      `${channel}\n<lastBuildDate>${toRfc822Date(newest.frontmatter.date)}</lastBuildDate>`,
  })
}

export const buildBlogRssFeed = (
  posts: ReadonlyArray<BlogPostEntry>,
  articleHtmlBySlug: ReadonlyMap<string, string>,
): string => {
  const items = pipe(
    posts,
    Array.map(entry =>
      blogPostRssItem(
        entry,
        Option.fromNullishOr(articleHtmlBySlug.get(entry.slug)),
      ),
    ),
    Array.join('\n'),
  )

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
${rssChannelHeader(posts)}
${items}
</channel>
</rss>`
}

// TEMPLATE

// NOTE: the generated `/` is written over `index.html`, which is also where
// the client build leaves the template, so reading the template from that file
// works once and then reads back a page whose placeholder is already replaced.
// The built file is authoritative while it still holds the placeholder, and
// the cached copy it leaves behind is what lets a re-run against one client
// build generate the same pages. The placeholder is the condition
// `injectIntoTemplate` itself enforces, so a static render, which carries no
// hydration stamp, is covered by the same test.
// Takes its paths so a test can drive it over a directory it controls; the
// prerender itself always runs it over the build.
export const readTemplateFrom = (
  indexPath: string,
  templateCopyPath: string,
): Effect.Effect<string, PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const isBuilt = yield* fs.exists(indexPath)
    if (!isBuilt) {
      return yield* Effect.die(
        new Error(
          `Cannot prerender without a client build: "${indexPath}" does not exist.`,
        ),
      )
    }

    const builtIndex = yield* fs.readFileString(indexPath)
    const isTemplate = builtIndex.includes(CONTAINER_PLACEHOLDER)
    if (isTemplate) {
      yield* fs.makeDirectory(dirname(templateCopyPath), { recursive: true })
      yield* fs.writeFileString(templateCopyPath, builtIndex)
      return builtIndex
    }

    const hasTemplateCopy = yield* fs.exists(templateCopyPath)
    if (!hasTemplateCopy) {
      return yield* Effect.die(
        new Error(
          `Cannot prerender: "${indexPath}" no longer holds the ${CONTAINER_PLACEHOLDER} placeholder, and no copy of the template remains. Run the client build again.`,
        ),
      )
    }

    return yield* fs.readFileString(templateCopyPath)
  })

const readTemplate = readTemplateFrom(INDEX_PATH, TEMPLATE_COPY_PATH)

// CONTENT API

const writeJsonDocument = (relativePath: string, document: unknown) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const filePath = resolve(DIST_DIR, relativePath.replace(/^\//, ''))

    yield* fs.makeDirectory(dirname(filePath), { recursive: true })
    yield* fs.writeFileString(
      filePath,
      `${JSON.stringify(document, null, 2)}\n`,
    )
  })

// NOTE: `404.json` is written here rather than kept in `public/` so the site's
// JSON error body and the API's own not-found body stay one document. The
// static host serves it for unknown paths (see scripts/website-vercel-config.mjs).
const writeContentApi = (
  entries: ReadonlyArray<ApiPageEntry>,
  generated: string,
) =>
  Effect.gen(function* () {
    const documents = contentApiDocuments({
      pages: entries,
      examples,
      posts: blogPosts,
      generated,
    })

    yield* Effect.forEach(
      documents,
      ({ path, document }) => writeJsonDocument(path, document),
      { concurrency: 8 },
    )

    yield* Console.log(
      `  ✓ ${API_BASE_PATH} (${documents.length} JSON documents)`,
    )
  })

// PROGRAM

const resultToIndexEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult): LlmsIndexEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
  })

const resultToApiPageEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult): ApiPageEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
    markdown: result.markdown,
  })

const resultToFullEntry =
  (resolveApiModuleName: ApiModuleNameResolver) =>
  (result: PrerenderResult, orderIndex: number): LlmsFullEntry => ({
    urlPath: result.urlPath,
    metadata: routeToMetadata(result.route, resolveApiModuleName),
    markdown: result.markdown,
    orderIndex,
  })

// NOTE: page rendering runs through the server bundle with no browser, but
// blog cover share cards still rasterize through a real page, so OG image
// generation holds the one remaining Playwright browser.
const playwrightBrowserResource = Effect.acquireRelease(
  Effect.tryPromise(() => chromium.launch({ headless: true })),
  browser => Effect.promise(() => browser.close()),
)

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Console.log('Starting prerender...')

    const serverEntry = yield* loadServerEntry
    const browser = yield* playwrightBrowserResource

    const apiModules = yield* readApiModules
    const apiModuleSlugs = Array.map(apiModules, ({ name }) =>
      moduleNameToSlug(name),
    )
    const resolveApiModuleName = buildApiModuleNameResolver(apiModules)
    const routes = enumerateRoutes(apiModuleSlugs)

    yield* generateOgImages(
      pipe(
        routes,
        Array.appendAll(PLAYGROUND_ROUTES),
        Array.append(NOT_FOUND_ROUTE),
      ),
      routeToUrlPath,
      DIST_DIR,
      resolveApiModuleName,
      browser,
    )

    const fs = yield* FileSystem.FileSystem
    const baseHtml = yield* readTemplate

    yield* prerenderPlaygroundShells(
      serverEntry,
      baseHtml,
      resolveApiModuleName,
    )

    yield* prerenderNotFoundPage(serverEntry, baseHtml, resolveApiModuleName)

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

    const feedArticleHtmlBySlug = new Map(
      pipe(successfulResults, Array.map(maybeFeedArticleEntry), Array.getSomes),
    )

    const rssFilePath = join(DIST_DIR, BLOG_RSS_PATH)
    yield* fs.makeDirectory(dirname(rssFilePath), { recursive: true })
    yield* fs.writeFileString(
      rssFilePath,
      buildBlogRssFeed(blogPosts, feedArticleHtmlBySlug),
    )
    yield* Console.log(`  ✓ ${BLOG_RSS_PATH}`)

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

    yield* writeContentApi(
      Array.map(markdownResults, resultToApiPageEntry(resolveApiModuleName)),
      lastModification,
    )

    yield* Console.log(
      `Prerendered ${routes.length} routes; emitted ${markdownResults.length} markdown pages.`,
    )
  }),
)

if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)))
}
