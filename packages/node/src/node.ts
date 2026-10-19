import {
  Config,
  Effect,
  FileSystem,
  Layer,
  Match,
  Option,
  PlatformError,
  Predicate,
  Schema,
} from 'effect'
import {
  HttpPlatform,
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
  HttpStaticServer,
} from 'effect/http'
import { Server } from 'foldkit/experimental'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { ReadableStream } from 'node:stream/web'
import { pathToFileURL } from 'node:url'

import { NodeHttpServer, NodeHttpServerRequest } from '@effect/platform-node'

const DEFAULT_MANIFEST_PATH = 'dist/server/foldkit.build.json'
const INVALID_ORIGIN_MESSAGE =
  'origin must be an HTTP or HTTPS origin without credentials, path, query, or fragment'
const ORIGIN_SYNTAX = /^https?:\/\/[^/?#\\\s@]+\/?$/i

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
   * to derive `http://localhost:<port>` from the resolved port. A supplied
   * origin must use HTTP or HTTPS and have no credentials, path, query, or
   * fragment.
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

const isPublicOriginUrl = (url: URL): boolean =>
  (url.protocol === 'http:' || url.protocol === 'https:') &&
  url.username === '' &&
  url.password === '' &&
  url.pathname === '/' &&
  url.search === '' &&
  url.hash === ''

const originFrom = (origin: string) =>
  Effect.gen(function* () {
    if (!ORIGIN_SYNTAX.test(origin)) {
      return yield* Effect.fail(new Error(INVALID_ORIGIN_MESSAGE))
    }

    const url = yield* Effect.try({
      try: () => new URL(origin),
      catch: () => new Error(INVALID_ORIGIN_MESSAGE),
    })

    if (!isPublicOriginUrl(url)) {
      return yield* Effect.fail(new Error(INVALID_ORIGIN_MESSAGE))
    }

    return url.origin
  })

const isRootRelativeBasePath = (basePath: string, url: URL): boolean =>
  basePath.startsWith('/') &&
  !basePath.startsWith('//') &&
  !basePath.includes('\\') &&
  basePath.endsWith('/') &&
  url.origin === 'http://localhost' &&
  url.search === '' &&
  url.hash === ''

const basePathFrom = (basePath: string | undefined) =>
  Effect.gen(function* () {
    const resolvedBasePath = basePath ?? '/'
    const url = yield* Effect.try({
      try: () => new URL(resolvedBasePath, 'http://localhost'),
      catch: () =>
        new Error('basePath must be a root-relative path ending with `/`'),
    })

    if (!isRootRelativeBasePath(resolvedBasePath, url)) {
      return yield* Effect.fail(
        new Error('basePath must be a root-relative path ending with `/`'),
      )
    }

    return url.pathname
  })

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
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => JSON.parse(content),
      catch: cause =>
        new Error('foldkit.build.json is not valid JSON', { cause }),
    })

    return yield* Schema.decodeUnknownEffect(FoldkitBuildManifest)(parsed)
  })

const buildPaths = (
  manifestPath: string,
  manifest: FoldkitBuildManifest,
  rootDirectory: string | undefined,
) => {
  const serverDirectory = dirname(manifestPath)
  const normalizedServerDirectory = posix.normalize(manifest.server)
  if (
    rootDirectory === undefined &&
    (normalizedServerDirectory === '..' ||
      normalizedServerDirectory.startsWith('../'))
  ) {
    return Effect.fail(
      new Error(
        'foldkit.build.json describes a server directory outside the Vite root. Pass rootDirectory so @foldkit/node can locate the client output.',
      ),
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
    return Effect.fail(
      new Error(
        `rootDirectory resolves ${manifest.server} to ${expectedServerDirectory}, but the manifest is at ${serverDirectory}`,
      ),
    )
  }

  return Effect.succeed<BuildPaths>({
    clientDirectory: resolve(resolvedRootDirectory, manifest.client),
    fetchHandlerPath: resolve(serverDirectory, manifest.serverEntry),
  })
}

const readBuildPaths = (
  manifestPath: string,
  rootDirectory: string | undefined,
) =>
  Effect.gen(function* () {
    const content = yield* Effect.tryPromise({
      try: () => readFile(manifestPath, 'utf8'),
      catch: cause =>
        new Error(`could not read Foldkit build manifest at ${manifestPath}`, {
          cause,
        }),
    })
    const manifest = yield* decodeManifest(content)

    return yield* buildPaths(manifestPath, manifest, rootDirectory)
  })

const loadFetchHandler = (fetchHandlerPath: string) =>
  Effect.gen(function* () {
    const loaded = yield* Effect.tryPromise({
      try: () => import(pathToFileURL(fetchHandlerPath).href),
      catch: cause =>
        new Error(
          `could not load the Foldkit fetch handler at ${fetchHandlerPath}. Run \`vite build\` first.`,
          { cause },
        ),
    })

    if (!isFetchModule(loaded)) {
      return yield* Effect.fail(
        new Error(
          `${fetchHandlerPath} must default-export a Web fetch handler`,
        ),
      )
    }

    return loaded.default
  })

const fetchResponse = (
  app: FetchHandler,
  request: HttpServerRequest.HttpServerRequest,
  requestUrl: string,
) =>
  Effect.gen(function* () {
    const signal = yield* Effect.abortSignal
    const webRequest = yield* HttpServerRequest.toWeb(request, { signal })
    // NOTE: A rejected Fetch handler promise is an unhandled application
    // defect. Expected application failures should be returned as Responses.
    const response = yield* Effect.promise(() =>
      app.fetch(new Request(requestUrl, webRequest)),
    )
    const headers = new Headers(response.headers)
    const setCookieHeaders = headers.getSetCookie()
    headers.delete('set-cookie')
    const nodeResponse = NodeHttpServerRequest.toServerResponse(request)

    if (setCookieHeaders.length > 0) {
      nodeResponse.setHeader('set-cookie', setCookieHeaders)
    }

    const responseOptions = {
      status: response.status,
      statusText: response.statusText,
      headers,
    }
    if (response.body === null) {
      return HttpServerResponse.empty(responseOptions)
    }

    const webReader = response.body.getReader()
    const nodeBody = Readable.fromWeb(
      new ReadableStream<Uint8Array>({
        async pull(controller) {
          const chunk = await webReader.read()
          if (chunk.done) {
            controller.close()
          } else {
            controller.enqueue(chunk.value)
          }
        },
        cancel: reason => webReader.cancel(reason),
      }),
    )
    const destroyBody = () => nodeBody.destroy()
    nodeResponse.once('close', destroyBody)
    nodeBody.once('close', () => nodeResponse.off('close', destroyBody))
    if (signal.aborted) {
      nodeBody.destroy()
    }

    return HttpServerResponse.raw(nodeBody, responseOptions)
  })

const confinedStaticFiles = (clientDirectory: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem
    const httpPlatform = yield* HttpPlatform.HttpPlatform
    const root = yield* fileSystem.realPath(clientDirectory)

    const confinedRealPath = (path: string) =>
      Effect.gen(function* () {
        const canonicalPath = yield* fileSystem.realPath(path)
        const fromRoot = relative(root, canonicalPath)
        const isContained =
          fromRoot === '' ||
          (fromRoot !== '..' &&
            !fromRoot.startsWith(`..${sep}`) &&
            !isAbsolute(fromRoot))
        if (isContained) {
          return canonicalPath
        }
        return yield* Effect.fail(
          PlatformError.systemError({
            _tag: 'NotFound',
            module: 'FileSystem',
            method: 'realPath',
            pathOrDescriptor: path,
          }),
        )
      })

    const confinedFileSystem = FileSystem.FileSystem.of({
      ...fileSystem,
      stat: path => Effect.flatMap(confinedRealPath(path), fileSystem.stat),
    })
    const confinedPlatform = HttpPlatform.HttpPlatform.of({
      ...httpPlatform,
      fileResponse: (path, options) =>
        Effect.flatMap(confinedRealPath(path), canonicalPath =>
          httpPlatform.fileResponse(canonicalPath, options),
        ),
    })

    return yield* HttpStaticServer.make({ root, index: undefined }).pipe(
      Effect.provideService(FileSystem.FileSystem, confinedFileSystem),
      Effect.provideService(HttpPlatform.HttpPlatform, confinedPlatform),
    )
  })

const makeHandler = (options: ServeOptions, port: number) =>
  Effect.gen(function* () {
    const origin = yield* originFrom(
      Option.getOrElse(
        yield* options.origin,
        () => `http://localhost:${globalThis.String(port)}`,
      ),
    )

    const manifestPath = resolve(
      process.cwd(),
      options.manifestPath ?? DEFAULT_MANIFEST_PATH,
    )
    const paths = yield* readBuildPaths(manifestPath, options.rootDirectory)
    const basePath = yield* basePathFrom(options.basePath)
    const app = yield* loadFetchHandler(paths.fetchHandlerPath)
    const staticFiles = yield* confinedStaticFiles(paths.clientDirectory)

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

const serverLayer = (options: ServeOptions, port: number) =>
  Layer.unwrap(
    Effect.map(makeHandler(options, port), handler =>
      HttpServer.serve(handler),
    ),
  ).pipe(
    HttpServer.withLogAddress,
    Layer.provide(NodeHttpServer.layer(createServer, { port })),
  )

/**
 * Starts a Node HTTP server for a built Foldkit application.
 *
 * The server reads `foldkit.build.json`, serves its client directory for GET
 * and HEAD requests, and sends every other application request to the emitted
 * Web Fetch handler. Interrupting the returned Effect closes the HTTP server.
 */
export const serve = (options: ServeOptions) =>
  Effect.flatMap(options.port, port => Layer.launch(serverLayer(options, port)))
