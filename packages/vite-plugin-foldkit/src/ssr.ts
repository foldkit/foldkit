import { Array, Effect, Predicate } from 'effect'
import * as Server from 'foldkit/experimental/server'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import type {
  Connect,
  DevEnvironment,
  Plugin,
  ProxyOptions,
  ViteDevServer,
} from 'vite'

import { buildIdForCommand } from './buildToken.js'

/** Options for serving server-rendered pages from the Vite dev server. */
export type FoldkitSsrOptions = Readonly<{
  /**
   * Module path of the server entry, resolved by Vite (e.g.
   * `'/src/entry.server.ts'`). The module must export a `renderPage`
   * function taking a Web `Request` and returning a
   * `Promise<EntryResult>`.
   */
  serverEntry: string
  /**
   * The `id` of the empty container element in `index.html` the rendered
   * markup replaces. Defaults to `'root'`.
   */
  containerId?: string
  /**
   * The origin the entry sees as `Request.url`, such as
   * `'https://app.example'`. Defaults to the origin the dev server itself
   * resolved from its own configuration.
   *
   * The origin is deployment configuration rather than something a request
   * carries. A client chooses its own `Host` header, and Vite accepts IP
   * literals and (with `allowedHosts`) arbitrary names, so deriving the origin
   * from the request would let the client pick the redirects, canonical URLs,
   * and cookie domains an entry builds from `Request.url`. Set this when the
   * dev server sits behind a proxy or TLS terminator that serves a different
   * public origin.
   */
  origin?: string
  /**
   * The deployment id compiled into a server entry when `foldkitSsr` is used
   * as a standalone plugin. It defaults to `FOLDKIT_BUILD_ID`, or to the fixed
   * development id in serve mode. The aggregate `foldkit` plugin supplies its
   * top-level `buildId` here automatically.
   *
   * The value is public in rendered HTML, so it must not be a secret.
   */
  buildId?: string
  /**
   * Skip the stand-down warning when the `ssr` environment is not runnable.
   * The aggregate plugin sets this when `ssr.build` is on, because production
   * still needs `serverEntry` and the host is supposed to serve.
   */
  quietStandDown?: boolean
}>

// Whether an environment can evaluate modules in this process, which is what
// loading the server entry needs. Vite's own `isRunnableDevEnvironment` is an
// `instanceof` check against the `RunnableDevEnvironment` class of whichever
// copy of Vite the caller imported — and a plugin supporting a range of majors
// is not always imported by the copy that created the server, so that check
// reports a perfectly runnable environment as not runnable. The lazily
// constructed `runner` accessor is the shape every major agrees on, and `in`
// reads the descriptor rather than invoking the getter, so probing costs
// nothing.
const isRunnable = (environment: DevEnvironment): boolean =>
  'runner' in environment

const isEntryModule = (
  loadedModule: unknown,
): loadedModule is Server.EntryModule =>
  Predicate.isObject(loadedModule) &&
  Predicate.hasProperty(loadedModule, 'renderPage') &&
  Predicate.isFunction(loadedModule.renderPage)

// The origin the dev server serves, taken from the plugin option when the
// deployment sets one and otherwise from the server's own resolved
// configuration. The request never contributes: `Host` is a value the client
// writes, and Vite accepts IP literals by default and any name at all under
// `allowedHosts`, so a request could otherwise name the origin the entry builds
// redirects and canonical URLs from.
const DEV_SERVER_FALLBACK_ORIGIN = 'http://localhost'

const configuredOrigin = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
): string => {
  if (options.origin !== undefined) {
    return options.origin
  }
  const [resolvedUrl] = server.resolvedUrls?.local ?? []
  if (resolvedUrl !== undefined) {
    // Vite prints these with a trailing slash; `new URL` normalizes either form
    // and `origin` drops the path, so both are safe to read here.
    try {
      return new URL(resolvedUrl).origin
    } catch {
      return DEV_SERVER_FALLBACK_ORIGIN
    }
  }
  const { https, port } = server.config.server
  const scheme = https === undefined ? 'http' : 'https'
  return port === undefined
    ? DEV_SERVER_FALLBACK_ORIGIN
    : `${scheme}://localhost:${port}`
}

const toWebRequest = (
  requestUrl: string,
  nodeRequest: Connect.IncomingMessage,
): Request => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(nodeRequest.headers)) {
    if (Predicate.isString(value)) {
      headers.set(name, value)
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item)
      }
    }
  }

  const method = nodeRequest.method ?? 'GET'
  const requestInit: RequestInit & { duplex?: 'half' } = { headers, method }

  if (method !== 'GET' && method !== 'HEAD') {
    // NOTE: Node and the DOM library declare structurally different
    // ReadableStream interfaces even though Node's `Readable.toWeb` returns
    // the Web stream implementation that `Request` consumes at runtime.
    requestInit.body = Readable.toWeb(nodeRequest) as ReadableStream<Uint8Array>
    requestInit.duplex = 'half'
  }

  return new Request(requestUrl, requestInit)
}

// NOTE: this middleware runs after Vite's modules and assets, so a request
// reaching it is application-owned. It classifies the request the same way a
// production host does, through the shared `foldkit/experimental/server`
// helpers. A deep route's HTML-or-not decision hinges on the Accept header, so
// both the rendered representation and the refused one must carry Vary: Accept
// for shared caches, the same as a production host.
type RenderDecision =
  | 'Render'
  | 'RenderNegotiated'
  | 'RefusedNegotiated'
  | 'RefusedPathAsset'
  | 'RefusedDestinationAsset'

const originalRequestTargetOf = (
  nodeRequest: Connect.IncomingMessage,
): string => nodeRequest.originalUrl ?? nodeRequest.url ?? '/'

const requestTargetOf = (nodeRequest: Connect.IncomingMessage): string =>
  nodeRequest.url ?? nodeRequest.originalUrl ?? '/'

// The request target resolved against the configured origin, or `undefined`
// when it names a different one (an absolute-form target, or a network-path
// reference such as `//elsewhere.example/page`). The dev host refuses those
// rather than handing the entry an origin the client chose, which is what a
// generated production host does too.
const resolvedRequestUrl = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  nodeRequest: Connect.IncomingMessage,
): string | undefined =>
  Server.resolveRequestUrl(
    originalRequestTargetOf(nodeRequest),
    configuredOrigin(server, options),
  ) === undefined
    ? undefined
    : Server.resolveRequestUrl(
        requestTargetOf(nodeRequest),
        configuredOrigin(server, options),
      )

const prepareRequestTarget = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  requestUrls: WeakMap<Connect.IncomingMessage, string>,
  nodeRequest: Connect.IncomingMessage,
): string | undefined => {
  const requestUrl =
    requestUrls.get(nodeRequest) ??
    resolvedRequestUrl(server, options, nodeRequest)
  if (requestUrl === undefined) {
    return undefined
  }
  requestUrls.set(nodeRequest, requestUrl)
  const resolved = new URL(requestUrl)
  nodeRequest.url = `${resolved.pathname}${resolved.search}`
  return requestUrl
}

const requestTargetMiddleware =
  (
    server: ViteDevServer,
    options: FoldkitSsrOptions,
    requestUrls: WeakMap<Connect.IncomingMessage, string>,
    render: Connect.NextHandleFunction,
  ): Connect.NextHandleFunction =>
  (nodeRequest, nodeResponse, next): void => {
    const requestUrl = prepareRequestTarget(
      server,
      options,
      requestUrls,
      nodeRequest,
    )
    if (requestUrl === undefined) {
      nodeResponse.statusCode = 400
      nodeResponse.end()
      return
    }
    if (nodeRequest.method === 'OPTIONS') {
      const proxy = server.config.server.proxy
      if (
        isProxyRequest(nodeRequest, proxy) ||
        shouldViteCorsAnswerPreflight(nodeRequest, proxy, server.config.base)
      ) {
        next()
        return
      }
      render(nodeRequest, nodeResponse, next)
      return
    }
    next()
  }

const renderDecision = (
  nodeRequest: Connect.IncomingMessage,
  requestUrl: string,
): RenderDecision => {
  const method = nodeRequest.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') {
    if (Server.resolvesToIndexHtml(requestUrl)) {
      return 'Render'
    }
    // A request Vite did not serve and that names an asset is a miss, not a
    // navigation. Browsers fetch scripts and stylesheets with `Accept: */*`, so
    // without this a stale hashed asset would be answered with the app shell at
    // 200 and read as a blank page instead of the 404 it is.
    const fetchDestination = nodeRequest.headers['sec-fetch-dest']
    const classification = Server.classifyRequest(
      requestUrl,
      Predicate.isString(fetchDestination) ? fetchDestination : undefined,
    )
    if (classification === 'PathAsset') {
      return 'RefusedPathAsset'
    }
    if (classification === 'DestinationAsset') {
      return 'RefusedDestinationAsset'
    }
    const accept = nodeRequest.headers.accept
    return Server.acceptsHtml(Predicate.isString(accept) ? accept : undefined)
      ? 'RenderNegotiated'
      : 'RefusedNegotiated'
  }
  return 'Render'
}

const renderRequest = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  nodeRequest: Connect.IncomingMessage,
  requestUrl: string,
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const { pathname, search } = new URL(requestUrl)
    const route = `${pathname}${search}`

    const rawTemplate = yield* Effect.promise(() =>
      readFile(resolve(server.config.root, 'index.html'), 'utf-8'),
    )

    // NOTE: the first argument tells Vite where the HTML lives, and Vite
    // resolves the template's relative URLs (such as a `./src/entry.ts`
    // script) against it. The template always lives at the site root, so
    // that argument must stay `/index.html` no matter which route is being
    // rendered. The third argument, named `originalUrl` in Vite's signature,
    // carries the route actually being requested.
    const template = yield* Effect.promise(() =>
      server.transformIndexHtml('/index.html', rawTemplate, route),
    )

    const loadedModule = yield* Effect.promise(() =>
      server.ssrLoadModule(options.serverEntry),
    )

    if (!isEntryModule(loadedModule)) {
      return yield* Effect.die(
        new Error(
          `[foldkit] '${options.serverEntry}' does not export a renderPage function, so the dev server cannot render pages.`,
        ),
      )
    }

    const result = yield* Effect.promise(() =>
      loadedModule.renderPage(toWebRequest(requestUrl, nodeRequest)),
    )

    return Server.toResponse(
      template,
      result,
      options.containerId === undefined
        ? {}
        : { containerId: options.containerId },
    )
  })

const varyHeaderValue = (
  value: string | number | Array<string> | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

// NOTE: every outcome a static miss negotiates declares both headers the
// negotiation read. Declaring only Accept would let a shared cache store the
// rendered page from a document request and serve it to a later script request
// carrying the same Accept, which never reaches the asset classification, and
// the reverse for the 404.
// Every field name in `incoming`, folded into `existing`. The application's own
// Vary is a list, and `Server.varyWith` merges one name at a time.
const mergeVary = (existing: string | undefined, incoming: string): string =>
  incoming
    .split(',')
    .map(token => token.trim())
    .filter(token => token !== '')
    .reduce(
      (merged, fieldName) => Server.varyWith(merged, fieldName),
      existing ?? '',
    )

type HeaderValue = string | number | ReadonlyArray<string> | undefined

type HeaderMutation = Readonly<{
  name: string
  before: HeaderValue
  after: HeaderValue
}>

const isHeaderList = (value: HeaderValue): value is ReadonlyArray<string> =>
  typeof value === 'object'

const cloneHeaderValue = (value: HeaderValue): HeaderValue =>
  isHeaderList(value) ? [...value] : value

const responseHeaders = (
  nodeResponse: ServerResponse,
): Readonly<Record<string, HeaderValue>> =>
  Object.fromEntries(
    Object.entries(nodeResponse.getHeaders()).map(([name, value]) => [
      name,
      cloneHeaderValue(value),
    ]),
  )

const isSameHeaderValue = (left: HeaderValue, right: HeaderValue): boolean => {
  if (isHeaderList(left) && isHeaderList(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => value === right.at(index))
    )
  }
  return left === right
}

const headerMutations = (
  before: Readonly<Record<string, HeaderValue>>,
  after: Readonly<Record<string, HeaderValue>>,
): ReadonlyArray<HeaderMutation> =>
  Object.keys(after)
    .filter(name => !isSameHeaderValue(before[name], after[name]))
    .map(name => ({ name, before: before[name], after: after[name] }))

const varyFields = (value: HeaderValue): ReadonlyArray<string> => {
  if (typeof value === 'string') {
    return value.split(',').map(fieldName => fieldName.trim())
  }
  if (isHeaderList(value)) {
    return value.flatMap(item =>
      item.split(',').map(fieldName => fieldName.trim()),
    )
  }
  return []
}

const restoreVary = (
  nodeResponse: ServerResponse,
  mutation: HeaderMutation,
): void => {
  const fieldsBeforeCors = new Set(
    varyFields(mutation.before).map(fieldName => fieldName.toLowerCase()),
  )
  const fieldsAddedByCors = new Set(
    varyFields(mutation.after)
      .filter(fieldName => !fieldsBeforeCors.has(fieldName.toLowerCase()))
      .map(fieldName => fieldName.toLowerCase()),
  )
  const remainingFields = varyFields(
    nodeResponse.getHeader(mutation.name),
  ).filter(fieldName => !fieldsAddedByCors.has(fieldName.toLowerCase()))

  if (Array.isArrayEmpty(remainingFields)) {
    nodeResponse.removeHeader(mutation.name)
  } else {
    nodeResponse.setHeader(mutation.name, remainingFields.join(', '))
  }
}

const restoreResponseHeaders = (
  nodeResponse: ServerResponse,
  mutations: ReadonlyArray<HeaderMutation>,
  headersWrittenAfterCors: ReadonlySet<string>,
): void => {
  for (const mutation of mutations) {
    if (headersWrittenAfterCors.has(mutation.name.toLowerCase())) {
      continue
    }
    const current = cloneHeaderValue(nodeResponse.getHeader(mutation.name))
    if (mutation.name.toLowerCase() === 'vary') {
      restoreVary(nodeResponse, mutation)
    } else if (isSameHeaderValue(current, mutation.after)) {
      if (mutation.before === undefined) {
        nodeResponse.removeHeader(mutation.name)
      } else {
        nodeResponse.setHeader(mutation.name, mutation.before)
      }
    }
  }
}

type HeaderWriteTracking = Readonly<{
  names: ReadonlySet<string>
  stop: () => void
}>

const trackHeaderWrites = (
  nodeResponse: ServerResponse,
): HeaderWriteTracking => {
  const names = new Set<string>()
  const setHeader = nodeResponse.setHeader
  const appendHeader = nodeResponse.appendHeader
  const removeHeader = nodeResponse.removeHeader

  nodeResponse.setHeader = function (name, value) {
    names.add(String(name).toLowerCase())
    return Reflect.apply(setHeader, this, [name, value])
  }
  nodeResponse.appendHeader = function (name, value) {
    names.add(String(name).toLowerCase())
    return Reflect.apply(appendHeader, this, [name, value])
  }
  nodeResponse.removeHeader = function (name) {
    names.add(String(name).toLowerCase())
    return Reflect.apply(removeHeader, this, [name])
  }

  return {
    names,
    stop: () => {
      nodeResponse.setHeader = setHeader
      nodeResponse.appendHeader = appendHeader
      nodeResponse.removeHeader = removeHeader
    },
  }
}

type CorsResponseState = Readonly<{
  mutations: ReadonlyArray<HeaderMutation>
  tracking: HeaderWriteTracking
}>

type ProxyConfiguration =
  Readonly<Record<string, string | ProxyOptions>> | undefined

const isProxyRequest = (
  nodeRequest: Connect.IncomingMessage,
  proxy: ProxyConfiguration,
): boolean => {
  const requestUrl = nodeRequest.url
  if (requestUrl === undefined || proxy === undefined) {
    return false
  }
  return Object.entries(proxy).some(([context, proxyOptions]) => {
    if (proxyOptions === undefined) {
      return false
    }
    return context.startsWith('^')
      ? new RegExp(context).test(requestUrl)
      : requestUrl.startsWith(context)
  })
}

const VITE_SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  'astro',
  'cts',
  'jsx',
  'mdx',
  'mts',
  'svelte',
  'ts',
  'tsx',
  'vue',
])

const hasViteSourceExtension = (path: string): boolean => {
  const lastSegment = path.slice(path.lastIndexOf('/') + 1)
  const separator = lastSegment.lastIndexOf('.')
  return (
    separator >= 0 &&
    VITE_SOURCE_EXTENSIONS.has(lastSegment.slice(separator + 1).toLowerCase())
  )
}

const shouldViteCorsAnswerPreflight = (
  nodeRequest: Connect.IncomingMessage,
  proxy: ProxyConfiguration,
  base: string,
): boolean => {
  if (isProxyRequest(nodeRequest, proxy)) {
    return false
  }
  const requestedMethod = nodeRequest.headers['access-control-request-method']
  const requestOrigin = nodeRequest.headers.origin
  if (
    !Predicate.isString(requestedMethod) ||
    !Predicate.isString(requestOrigin) ||
    requestOrigin === ''
  ) {
    return false
  }
  const normalizedMethod = requestedMethod.toUpperCase()
  if (normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD') {
    return false
  }
  const requestTarget = requestTargetOf(nodeRequest)
  const path = new URL(requestTarget, DEV_SERVER_FALLBACK_ORIGIN).pathname
  const vitePath =
    base !== '/' && path.startsWith(base) ? `/${path.slice(base.length)}` : path
  if (
    vitePath.startsWith('/@') ||
    vitePath.startsWith('/__vite') ||
    vitePath.startsWith('/node_modules/') ||
    hasViteSourceExtension(vitePath)
  ) {
    return true
  }
  const fetchDestination = nodeRequest.headers['sec-fetch-dest']
  return (
    Server.classifyRequest(
      requestTarget,
      Predicate.isString(fetchDestination) ? fetchDestination : undefined,
    ) !== 'Page'
  )
}

const wrapViteCors = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  requestUrls: WeakMap<Connect.IncomingMessage, string>,
  stateByRequest: WeakMap<Connect.IncomingMessage, CorsResponseState>,
): void => {
  if (server.config.server.cors === false) {
    return
  }
  const corsLayer = server.middlewares.stack.find(
    layer =>
      Predicate.isFunction(layer.handle) &&
      layer.handle.name.startsWith('corsMiddleware'),
  )
  if (corsLayer === undefined || !Predicate.isFunction(corsLayer.handle)) {
    throw new Error(
      '[foldkit] Could not find Vite\u2019s CORS middleware at the expected ' +
        'ownership boundary. This Vite version is not compatible with ' +
        '@foldkit/vite-plugin.',
    )
  }
  const viteCors = corsLayer.handle
  const wrappedCors: Connect.NextHandleFunction = (
    nodeRequest,
    nodeResponse,
    next,
  ): void => {
    if (
      prepareRequestTarget(server, options, requestUrls, nodeRequest) ===
      undefined
    ) {
      nodeResponse.statusCode = 400
      nodeResponse.end()
      return
    }
    if (
      nodeRequest.method === 'OPTIONS' &&
      !shouldViteCorsAnswerPreflight(
        nodeRequest,
        server.config.server.proxy,
        server.config.base,
      )
    ) {
      next()
      return
    }
    const before = responseHeaders(nodeResponse)
    Reflect.apply(viteCors, undefined, [
      nodeRequest,
      nodeResponse,
      (error: unknown) => {
        stateByRequest.set(nodeRequest, {
          mutations: headerMutations(before, responseHeaders(nodeResponse)),
          tracking: trackHeaderWrites(nodeResponse),
        })
        next(error)
      },
    ])
  }
  corsLayer.handle = wrappedCors
}

const setNegotiatedVary = (nodeResponse: ServerResponse): void => {
  const existing = varyHeaderValue(nodeResponse.getHeader('vary'))
  nodeResponse.setHeader(
    'vary',
    Server.varyWith(Server.varyWithAccept(existing), 'Sec-Fetch-Dest'),
  )
}

const sendWebResponse = async (
  webResponse: Response,
  nodeRequest: Connect.IncomingMessage,
  nodeResponse: ServerResponse,
  isNegotiated: boolean,
): Promise<void> => {
  nodeResponse.statusCode = webResponse.status
  if (webResponse.statusText !== '') {
    nodeResponse.statusMessage = webResponse.statusText
  }

  const getSetCookie = Predicate.hasProperty(
    webResponse.headers,
    'getSetCookie',
  )
    ? webResponse.headers.getSetCookie
    : undefined

  const setCookieHeaders = Predicate.isFunction(getSetCookie)
    ? getSetCookie.call(webResponse.headers)
    : []

  for (const [name, value] of webResponse.headers) {
    if (name === 'vary') {
      // NOTE: merged rather than set. Middleware that ran before the entry may
      // already have declared a field, and a plain setHeader here would replace
      // it when the application declares its own Vary.
      nodeResponse.setHeader(
        'vary',
        mergeVary(varyHeaderValue(nodeResponse.getHeader('vary')), value),
      )
    } else if (name !== 'set-cookie' || Array.isArrayEmpty(setCookieHeaders)) {
      nodeResponse.setHeader(name, value)
    }
  }

  if (Array.isArrayNonEmpty(setCookieHeaders)) {
    nodeResponse.setHeader('set-cookie', setCookieHeaders)
  }

  if (isNegotiated) {
    // Merge into whatever Vary already sits on the node response, including
    // the application's own fields, so declaring these does not drop it.
    setNegotiatedVary(nodeResponse)
  }

  if (nodeRequest.method === 'HEAD' || webResponse.body === null) {
    nodeResponse.end()
  } else {
    const body = new Uint8Array(await webResponse.arrayBuffer())
    nodeResponse.end(body)
  }
}

// The handler that turns an application-owned request into a response. OPTIONS
// reaches it at the host boundary. Other methods reach it after Vite's modules
// and assets have had an opportunity to answer.
const renderMiddleware =
  (
    server: ViteDevServer,
    options: FoldkitSsrOptions,
    requestUrls: WeakMap<Connect.IncomingMessage, string>,
    stateByRequest: WeakMap<Connect.IncomingMessage, CorsResponseState>,
  ) =>
  (
    nodeRequest: Connect.IncomingMessage,
    nodeResponse: ServerResponse,
    next: Connect.NextFunction,
  ): void => {
    const corsState = stateByRequest.get(nodeRequest)
    stateByRequest.delete(nodeRequest)
    corsState?.tracking.stop()
    restoreResponseHeaders(
      nodeResponse,
      corsState?.mutations ?? [],
      corsState?.tracking.names ?? new Set(),
    )

    const requestUrl =
      requestUrls.get(nodeRequest) ??
      resolvedRequestUrl(server, options, nodeRequest)
    requestUrls.delete(nodeRequest)
    if (requestUrl === undefined) {
      // The target names an origin other than the one being served, so there is
      // no request to render: answering it would hand the entry a client-chosen
      // origin to build redirects and canonical URLs from.
      nodeResponse.statusCode = 400
      nodeResponse.end()
      return
    }
    const method = nodeRequest.method ?? 'GET'
    if (Server.isHostSettledMethod(method)) {
      nodeResponse.statusCode = Server.HOST_METHOD_ANSWERS.refusedStatus
      nodeResponse.setHeader('allow', Server.HOST_METHOD_ANSWERS.allow)
      nodeResponse.end()
      return
    }
    const decision = renderDecision(nodeRequest, requestUrl)
    if (decision === 'RefusedPathAsset') {
      // The path names an asset whatever the request headers say, so this
      // refusal is the same for every client and needs no Vary.
      nodeResponse.statusCode = 404
      nodeResponse.end()
      return
    }
    if (decision === 'RefusedDestinationAsset') {
      nodeResponse.statusCode = 404
      setNegotiatedVary(nodeResponse)
      nodeResponse.end()
      return
    }
    if (decision === 'RefusedNegotiated') {
      nodeResponse.statusCode = 404
      setNegotiatedVary(nodeResponse)
      nodeResponse.end()
      return
    }
    const isNegotiated = decision === 'RenderNegotiated'
    void Effect.runPromise(
      renderRequest(server, options, nodeRequest, requestUrl),
    )
      .then(response =>
        sendWebResponse(response, nodeRequest, nodeResponse, isNegotiated),
      )
      .catch((error: unknown) => {
        if (error instanceof Error) {
          server.ssrFixStacktrace(error)
        }
        next(error)
      })
  }

/**
 * Serves server-rendered pages from the Vite dev server.
 *
 * Vite retains ownership of configured proxies, source modules, HMR, and
 * assets. Requests that fall through load the server entry through Vite's SSR
 * module loader, call its `renderPage` with a Web `Request`, and send the
 * resulting Web `Response`. Vite's host validation applies before either
 * owner. Foldkit then validates and normalizes the request target before Vite
 * or the server entry can resolve it. Vite's CORS option applies only to
 * Vite-owned responses, while the server entry owns CORS for application
 * responses. Server entry edits take effect without a restart.
 */
export const foldkitSsr = (options: FoldkitSsrOptions): Plugin => {
  return {
    name: 'foldkit-ssr',
    config: (_config, { command, isPreview }) => {
      const buildId = buildIdForCommand(command, options.buildId)
      return {
        // NOTE: `vite preview` also resolves with command 'serve', but it
        // serves built output and never runs configureServer. Setting custom
        // there would strip preview's HTML middleware. A build still needs the
        // define below even though only a dev server needs this app type.
        ...(command === 'serve' && isPreview !== true
          ? { appType: 'custom' }
          : {}),
        ...(buildId === undefined
          ? {}
          : {
              define: {
                'import.meta.env.FOLDKIT_BUILD_ID': JSON.stringify(buildId),
              },
            }),
      }
    },
    configureServer: server => {
      // Rendering here loads the server entry through the `ssr` environment's
      // module runner, which only a runnable environment has. A host plugin
      // that backs that environment with its own runtime — workerd, under a
      // Workers plugin — leaves it non-runnable, and that host is already the
      // one serving pages: its entry imports `renderPage` and answers the
      // request itself. Standing down hands those requests to it. Rendering
      // them here instead would run the application in Node, without the
      // bindings the deployed entry holds, while the deployment it is standing
      // in for renders in workerd.
      if (!isRunnable(server.environments.ssr)) {
        if (options.quietStandDown !== true) {
          server.config.logger.warn(
            '[foldkit] the "ssr" environment is not runnable, so another plugin owns' +
              " server-side execution. Dev-time rendering through Foldkit's Vite" +
              ' middleware is off; page requests go to that host.',
          )
        }
        return
      }

      const requestUrls = new WeakMap<Connect.IncomingMessage, string>()
      const stateByRequest = new WeakMap<
        Connect.IncomingMessage,
        CorsResponseState
      >()
      const render = renderMiddleware(
        server,
        options,
        requestUrls,
        stateByRequest,
      )
      server.middlewares.use(
        requestTargetMiddleware(server, options, requestUrls, render),
      )
      wrapViteCors(server, options, requestUrls, stateByRequest)

      return () => {
        server.middlewares.use(render)
      }
    },
  }
}
