import { Array, Effect, Predicate, String as String_ } from 'effect'
import { type ServerEntryModule, toResponse } from 'foldkit/experimental/server'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import type { Connect, Plugin, ViteDevServer } from 'vite'

/** Options for serving server-rendered pages from the Vite dev server. */
export type FoldkitSsrOptions = Readonly<{
  /**
   * Module path of the server entry, resolved by Vite (e.g.
   * `'/src/entry.server.ts'`). The module must export a `renderPage`
   * function taking a Web `Request` and returning a
   * `Promise<ServerEntryResult>`.
   */
  serverEntry: string
  /**
   * The `id` of the empty container element in `index.html` the rendered
   * markup replaces. Defaults to `'root'`.
   */
  containerId?: string
}>

const isServerEntryModule = (
  loadedModule: unknown,
): loadedModule is ServerEntryModule =>
  Predicate.isObject(loadedModule) &&
  Predicate.hasProperty(loadedModule, 'renderPage') &&
  Predicate.isFunction(loadedModule.renderPage)

const toWebRequest = (
  url: string,
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
  const host = nodeRequest.headers.host ?? 'localhost'
  const method = nodeRequest.method ?? 'GET'
  const requestInit: RequestInit & { duplex?: 'half' } = { headers, method }
  if (method !== 'GET' && method !== 'HEAD') {
    // NOTE: Node and the DOM library declare structurally different
    // ReadableStream interfaces even though Node's `Readable.toWeb` returns
    // the Web stream implementation that `Request` consumes at runtime.
    requestInit.body = Readable.toWeb(nodeRequest) as ReadableStream<Uint8Array>
    requestInit.duplex = 'half'
  }
  return new Request(new URL(url, `http://${host}`), requestInit)
}

const shouldRenderRequest = (nodeRequest: Connect.IncomingMessage): boolean => {
  const method = nodeRequest.method ?? 'GET'
  if (method !== 'GET' && method !== 'HEAD') {
    return true
  }
  const accept = nodeRequest.headers.accept
  return Predicate.isString(accept) && String_.includes('text/html')(accept)
}

const renderRequest = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  nodeRequest: Connect.IncomingMessage,
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const url = nodeRequest.originalUrl ?? nodeRequest.url ?? '/'
    const rawTemplate = yield* Effect.promise(() =>
      readFile(resolve(server.config.root, 'index.html'), 'utf-8'),
    )
    const template = yield* Effect.promise(() =>
      server.transformIndexHtml(url, rawTemplate),
    )
    const loadedModule = yield* Effect.promise(() =>
      server.ssrLoadModule(options.serverEntry),
    )
    if (!isServerEntryModule(loadedModule)) {
      return yield* Effect.die(
        new Error(
          `[foldkit] '${options.serverEntry}' does not export a renderPage function, so the dev server cannot render pages.`,
        ),
      )
    }
    const result = yield* Effect.promise(() =>
      loadedModule.renderPage(toWebRequest(url, nodeRequest)),
    )
    return toResponse(
      template,
      result,
      options.containerId === undefined
        ? {}
        : { containerId: options.containerId },
    )
  })

const sendWebResponse = async (
  webResponse: Response,
  nodeRequest: Connect.IncomingMessage,
  nodeResponse: ServerResponse,
): Promise<void> => {
  nodeResponse.statusCode = webResponse.status
  if (webResponse.statusText !== '') {
    nodeResponse.statusMessage = webResponse.statusText
  }

  const maybeGetSetCookie = Predicate.hasProperty(
    webResponse.headers,
    'getSetCookie',
  )
    ? webResponse.headers.getSetCookie
    : undefined
  const setCookieHeaders = Predicate.isFunction(maybeGetSetCookie)
    ? maybeGetSetCookie.call(webResponse.headers)
    : []

  for (const [name, value] of webResponse.headers) {
    if (name !== 'set-cookie' || Array.isArrayEmpty(setCookieHeaders)) {
      nodeResponse.setHeader(name, value)
    }
  }
  if (Array.isArrayNonEmpty(setCookieHeaders)) {
    nodeResponse.setHeader('set-cookie', setCookieHeaders)
  }

  if (nodeRequest.method === 'HEAD' || webResponse.body === null) {
    nodeResponse.end()
  } else {
    const body = new Uint8Array(await webResponse.arrayBuffer())
    nodeResponse.end(body)
  }
}

/**
 * Serves server-rendered pages from the Vite dev server.
 *
 * Registered after Vite's own middleware, so the client entry, HMR, and
 * assets are untouched. HTML navigations that fall through, plus non-GET
 * requests, load the server entry through Vite's SSR module loader, call its
 * `renderPage` with a Web `Request`, and send the resulting Web `Response`.
 * Server entry edits take effect without a restart.
 */
export const foldkitSsr = (options: FoldkitSsrOptions): Plugin => ({
  name: 'foldkit-ssr',
  apply: 'serve',
  config: () => ({ appType: 'custom' }),
  configureServer: server => () => {
    server.middlewares.use(
      (
        nodeRequest: Connect.IncomingMessage,
        nodeResponse: ServerResponse,
        next: Connect.NextFunction,
      ) => {
        if (!shouldRenderRequest(nodeRequest)) {
          next()
          return
        }
        void Effect.runPromise(renderRequest(server, options, nodeRequest))
          .then(response =>
            sendWebResponse(response, nodeRequest, nodeResponse),
          )
          .catch((error: unknown) => {
            if (error instanceof Error) {
              server.ssrFixStacktrace(error)
            }
            next(error)
          })
      },
    )
  },
})
