import { Config, Effect, Layer, Match, Option, Predicate, Schema } from 'effect'
import {
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
  HttpStaticServer,
} from 'effect/http'
import { Server } from 'foldkit/experimental'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, posix, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  NodeHttpPlatform,
  NodeHttpServer,
  NodeServices,
} from '@effect/platform-node'

const DEFAULT_MANIFEST_PATH = 'dist/server/foldkit.build.json'

const FoldkitBuildManifest = Schema.Struct({
  schemaVersion: Schema.Literals([1]),
  client: Schema.String,
  server: Schema.String,
  serverEntry: Schema.String,
  prerendered: Schema.Array(Schema.String),
})

type FoldkitBuildManifest = typeof FoldkitBuildManifest.Type

type FetchHandler = {
  readonly fetch: (request: Request) => Promise<Response>
}

type BuildPaths = Readonly<{
  clientDirectory: string
  fetchHandlerPath: string
}>

/** Configuration for a Node server that hosts a built Foldkit application. */
export type ServeOptions = Readonly<{
  /** The port Config that selects the listening port. */
  port: Config.Config<number>
  /**
   * The origin Config for requests that reach the Fetch handler. Use `None`
   * to derive `http://localhost:<port>` from the resolved port.
   */
  origin: Config.Config<Option.Option<string>>
  /**
   * The build manifest to read. Relative paths resolve from the process
   * working directory. It defaults to `dist/server/foldkit.build.json`.
   */
  manifestPath?: string
  /**
   * The deployed directory that corresponds to the Vite root. Provide it when
   * the manifest's server directory is outside that root. Relative paths
   * resolve from the process working directory.
   */
  rootDirectory?: string
  /**
   * The root-relative Vite base path for client assets. It defaults to `/` and
   * must end with `/`, such as `/app/`.
   */
  basePath?: string
}>

const isFetchHandler = (value: unknown): value is FetchHandler =>
  Predicate.hasProperty(value, 'fetch') && Predicate.isFunction(value.fetch)

const isFetchModule = (
  value: unknown,
): value is { readonly default: FetchHandler } =>
  Predicate.hasProperty(value, 'default') && isFetchHandler(value.default)

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean =>
  error.reason._tag === 'RouteNotFound'

const hostSettledResponse = () =>
  HttpServerResponse.setHeader(
    HttpServerResponse.empty({
      status: Server.HOST_METHOD_ANSWERS.refusedStatus,
    }),
    'allow',
    Server.HOST_METHOD_ANSWERS.allow,
  )

const basePathFrom = (basePath: string | undefined): string => {
  const resolvedBasePath = basePath ?? '/'
  let url: URL
  try {
    url = new URL(resolvedBasePath, 'http://localhost')
  } catch {
    throw new Error('basePath must be a root-relative path ending with `/`')
  }
  if (
    !resolvedBasePath.startsWith('/') ||
    resolvedBasePath.startsWith('//') ||
    resolvedBasePath.includes('\\') ||
    !resolvedBasePath.endsWith('/') ||
    url.origin !== 'http://localhost' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error('basePath must be a root-relative path ending with `/`')
  }
  return url.pathname
}

const staticPathFor = (
  pathname: string,
  basePath: string,
): string | undefined => {
  if (basePath === '/') {
    return pathname
  }
  if (!pathname.startsWith(basePath)) {
    return undefined
  }
  return `/${pathname.slice(basePath.length)}`
}

const decodeManifest = (content: string) =>
  Effect.try({
    try: () => JSON.parse(content),
    catch: cause =>
      new Error('foldkit.build.json is not valid JSON', { cause }),
  }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(FoldkitBuildManifest)))

const buildPaths = (
  manifestPath: string,
  manifest: FoldkitBuildManifest,
  rootDirectory: string | undefined,
): BuildPaths => {
  const serverDirectory = dirname(manifestPath)
  const normalizedServerDirectory = posix.normalize(manifest.server)
  if (
    rootDirectory === undefined &&
    (normalizedServerDirectory === '..' ||
      normalizedServerDirectory.startsWith('../'))
  ) {
    throw new Error(
      'foldkit.build.json describes a server directory outside the Vite root. Pass rootDirectory so @foldkit/node can locate the client output.',
    )
  }
  const resolvedRootDirectory =
    rootDirectory === undefined
      ? resolve(serverDirectory, relative(manifest.server, '.'))
      : resolve(process.cwd(), rootDirectory)
  const expectedServerDirectory = resolve(
    resolvedRootDirectory,
    manifest.server,
  )
  if (expectedServerDirectory !== serverDirectory) {
    throw new Error(
      `rootDirectory resolves ${manifest.server} to ${expectedServerDirectory}, but the manifest is at ${serverDirectory}`,
    )
  }

  return {
    clientDirectory: resolve(resolvedRootDirectory, manifest.client),
    fetchHandlerPath: resolve(serverDirectory, manifest.serverEntry),
  }
}

const readBuildPaths = (
  manifestPath: string,
  rootDirectory: string | undefined,
) =>
  Effect.tryPromise({
    try: () => readFile(manifestPath, 'utf8'),
    catch: cause =>
      new Error(`could not read Foldkit build manifest at ${manifestPath}`, {
        cause,
      }),
  }).pipe(
    Effect.flatMap(decodeManifest),
    Effect.map(manifest => buildPaths(manifestPath, manifest, rootDirectory)),
  )

const loadFetchHandler = (fetchHandlerPath: string) =>
  Effect.tryPromise({
    try: () => import(pathToFileURL(fetchHandlerPath).href),
    catch: cause =>
      new Error(
        `could not load the Foldkit fetch handler at ${fetchHandlerPath}. Run \`vite build\` first.`,
        { cause },
      ),
  }).pipe(
    Effect.flatMap(loaded =>
      isFetchModule(loaded)
        ? Effect.succeed(loaded.default)
        : Effect.fail(
            new Error(
              `${fetchHandlerPath} must default-export a Web fetch handler`,
            ),
          ),
    ),
  )

const fetchResponse = (
  app: FetchHandler,
  request: HttpServerRequest.HttpServerRequest,
  requestUrl: string,
) =>
  Effect.gen(function* () {
    const signal = yield* Effect.abortSignal
    const webRequest = yield* HttpServerRequest.toWeb(request, { signal })
    const response = yield* Effect.promise(() =>
      app.fetch(new Request(requestUrl, webRequest)),
    )
    return HttpServerResponse.fromWeb(response)
  })

const makeHandler = (options: ServeOptions) =>
  Effect.gen(function* () {
    const port = yield* options.port
    const origin = Option.getOrElse(
      yield* options.origin,
      () => `http://localhost:${globalThis.String(port)}`,
    )
    const manifestPath = resolve(
      process.cwd(),
      options.manifestPath ?? DEFAULT_MANIFEST_PATH,
    )
    const paths = yield* readBuildPaths(manifestPath, options.rootDirectory)
    const app = yield* loadFetchHandler(paths.fetchHandlerPath)
    const basePath = basePathFrom(options.basePath)
    const staticFiles = yield* HttpStaticServer.make({
      root: paths.clientDirectory,
      index: undefined,
    })

    return HttpServerRequest.HttpServerRequest.use(request => {
      const requestUrl = Server.resolveRequestUrl(request.url, origin)
      if (requestUrl === undefined) {
        return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
      }
      const resolved = new URL(requestUrl)
      const fetchRequest = request.modify({
        url: `${resolved.pathname}${resolved.search}`,
      })
      const staticPath = staticPathFor(resolved.pathname, basePath)
      const staticRequest =
        staticPath === undefined
          ? undefined
          : request.modify({ url: `${staticPath}${resolved.search}` })
      const response = Match.value(fetchRequest.method).pipe(
        Match.whenOr('GET', 'HEAD', () => {
          if (
            staticRequest === undefined ||
            Server.resolvesToIndexHtml(staticRequest.url)
          ) {
            return fetchResponse(app, fetchRequest, requestUrl)
          }
          return staticFiles.pipe(
            Effect.catchIf(isRouteNotFound, () =>
              fetchResponse(app, fetchRequest, requestUrl),
            ),
          )
        }),
        Match.orElse(() => {
          if (Server.isHostSettledMethod(fetchRequest.method)) {
            return Effect.succeed(hostSettledResponse())
          }
          return fetchResponse(app, fetchRequest, requestUrl)
        }),
      )
      return Effect.provideService(
        response,
        HttpServerRequest.HttpServerRequest,
        staticRequest ?? fetchRequest,
      )
    }).pipe(Effect.interruptible)
  })

const serverLayer = (options: ServeOptions) =>
  Layer.unwrap(
    Effect.map(makeHandler(options), handler => HttpServer.serve(handler)),
  ).pipe(
    HttpServer.withLogAddress,
    Layer.provide(
      NodeHttpServer.layerConfig(createServer, { port: options.port }),
    ),
    Layer.provide(NodeHttpPlatform.layer),
    Layer.provide(NodeServices.layer),
  )

/**
 * Starts a Node HTTP server for a built Foldkit application.
 *
 * The server reads `foldkit.build.json`, serves its client directory for GET
 * and HEAD requests, and sends every other application request to the emitted
 * Web Fetch handler. Interrupting the returned Effect closes the HTTP server.
 */
export const serve = (options: ServeOptions) =>
  Layer.launch(serverLayer(options))
