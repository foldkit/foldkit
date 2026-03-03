import { Command, FileSystem } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import {
  Array,
  Console,
  Deferred,
  Effect,
  Match as M,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium } from 'playwright'

import {
  AdvancedPatternsRoute,
  ApiModuleRoute,
  AppRoute,
  ArchitectureAndConceptsRoute,
  BestPracticesRoute,
  ComingFromReactRoute,
  ExamplesRoute,
  FoldkitUiRoute,
  GettingStartedRoute,
  HomeRoute,
  ProjectOrganizationRoute,
  RoutingAndNavigationRoute,
  WhyFoldkitRoute,
  advancedPatternsRouter,
  apiModuleRouter,
  architectureAndConceptsRouter,
  bestPracticesRouter,
  comingFromReactRouter,
  examplesRouter,
  foldkitUiRouter,
  gettingStartedRouter,
  homeRouter,
  projectOrganizationRouter,
  routingAndNavigationRouter,
  whyFoldkitRouter,
} from '../src/route'

// ROUTES

export const STATIC_ROUTES: ReadonlyArray<AppRoute> = [
  HomeRoute(),
  WhyFoldkitRoute(),
  GettingStartedRoute(),
  ArchitectureAndConceptsRoute(),
  ComingFromReactRoute(),
  RoutingAndNavigationRoute(),
  ExamplesRoute(),
  BestPracticesRoute(),
  ProjectOrganizationRoute(),
  AdvancedPatternsRoute(),
  FoldkitUiRoute(),
]

export const routeToUrlPath = (route: AppRoute): string =>
  M.value(route).pipe(
    M.withReturnType<string>(),
    M.tagsExhaustive({
      Home: () => homeRouter.build({}),
      WhyFoldkit: () => whyFoldkitRouter.build({}),
      GettingStarted: () => gettingStartedRouter.build({}),
      ArchitectureAndConcepts: () =>
        architectureAndConceptsRouter.build({}),
      ComingFromReact: () => comingFromReactRouter.build({}),
      RoutingAndNavigation: () =>
        routingAndNavigationRouter.build({}),
      Examples: () => examplesRouter.build({}),
      BestPractices: () => bestPracticesRouter.build({}),
      ProjectOrganization: () => projectOrganizationRouter.build({}),
      AdvancedPatterns: () => advancedPatternsRouter.build({}),
      FoldkitUi: () => foldkitUiRouter.build({}),
      ApiModule: ({ moduleSlug }) =>
        apiModuleRouter.build({ moduleSlug }),
      NotFound: () => '/',
    }),
  )

export const routeToOutputPath = (route: AppRoute): string => {
  const urlPath = routeToUrlPath(route)
  return urlPath === '/'
    ? 'index.html'
    : `${urlPath.slice(1)}/index.html`
}

const ROOT_PLACEHOLDER = '<div id="root"></div>'

export const injectHtml = (
  baseHtml: string,
  renderedHtml: string,
): string =>
  baseHtml.replace(
    ROOT_PLACEHOLDER,
    `<div id="root">${renderedHtml}</div>`,
  )

export const enumerateRoutes = (
  apiModuleNames: ReadonlyArray<string>,
): ReadonlyArray<AppRoute> =>
  pipe(
    STATIC_ROUTES,
    Array.appendAll(
      Array.map(apiModuleNames, moduleSlug =>
        ApiModuleRoute({ moduleSlug }),
      ),
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
          page.evaluate(
            () => document.body.firstElementChild?.outerHTML ?? '',
          ),
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
  return Array.map(apiDoc.children, ({ name }) => name)
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
        Console.warn(
          `  ✗ ${routeToUrlPath(route)}: ${String(error)}`,
        ),
      ),
    )

// PROGRAM

const program = Effect.scoped(
  Effect.gen(function* () {
    yield* Console.log('Starting prerender...')

    yield* previewServerResource
    const browser = yield* playwrightBrowserResource

    const apiModuleNames = yield* readApiModuleNames
    const routes = enumerateRoutes(apiModuleNames)

    const fs = yield* FileSystem.FileSystem
    const baseHtml = yield* fs.readFileString(
      resolve(DIST_DIR, 'index.html'),
    )

    yield* Effect.forEach(routes, prerenderRoute(browser, baseHtml), {
      concurrency: 4,
    })

    yield* Console.log(`Prerendered ${routes.length} routes.`)
  }),
)

NodeRuntime.runMain(program.pipe(Effect.provide(NodeContext.layer)))
