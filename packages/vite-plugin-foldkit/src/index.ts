import {
  Array,
  Clock,
  ConfigProvider,
  Console,
  Crypto,
  Data,
  Duration,
  Effect,
  Exit,
  Fiber,
  HashMap,
  HashSet,
  Layer,
  Match,
  Option,
  Predicate,
  Queue,
  Ref,
  Schedule,
  Schema,
  Stream,
  pipe,
} from 'effect'
import {
  Event as DevToolsEvent,
  EventFrame,
  RELAY_RECORD_VERSION,
  RequestFrame,
  Response,
  ResponseFrame,
  RuntimeInfo,
} from 'foldkit/devtools-protocol'
import {
  PreserveModelMessage,
  RequestModelMessage,
  RestoreModelMessage,
} from 'foldkit/model-preservation'
import { timingSafeEqual } from 'node:crypto'
import {
  type IncomingMessage,
  createServer as createHttpServer,
} from 'node:http'
import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import type { Duplex } from 'node:stream'
import type {
  HttpServer,
  Plugin,
  ResolvedConfig,
  ViteDevServer,
  WebSocketClient,
} from 'vite'
import { type WebSocket, WebSocketServer } from 'ws'

import * as NodeCrypto from '@effect/platform-node/NodeCrypto'
import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem'
import * as NodePath from '@effect/platform-node/NodePath'

import { type FoldkitBuildOptions, foldkitBuild } from './build.js'
import { foldkitBuildToken } from './buildToken.js'
import { devToolsOverlayPlugin } from './devToolsOverlay.js'
import { publishRelayRecord, retireRelayRecord } from './relayRegistry.js'
import { type FoldkitSsrOptions, foldkitSsr } from './ssr.js'
import { foldkitViewIdentity } from './viewIdentity.js'

export { type BrandDistResult, brandDistDirectory } from './brandDist.js'
export {
  FOLDKIT_FETCH_MODULE_ID,
  FoldkitBuildManifest,
  FoldkitBuildMetadata,
  type FoldkitBuildApi,
  type FoldkitBuildOptions,
  type FoldkitPrerenderOptions,
  foldkitBuild,
} from './build.js'
export { type FoldkitSsrOptions, foldkitSsr } from './ssr.js'
export {
  type ViewIdentityTransformResult,
  foldkitViewIdentity,
  transformViewIdentity,
} from './viewIdentity.js'

/** Options for the `foldkit` Vite plugin. */
export type FoldkitPluginOptions = Readonly<{
  /**
   * By default, the dev server hosts the DevTools MCP relay and publishes its
   * address for the MCP server to find. Middleware and HTTPS servers use a
   * separate loopback listener. Published addresses carry an access token.
   *
   * A number starts an unauthenticated listener on that port on every
   * interface; set `FOLDKIT_DEVTOOLS_MCP_PORT` in the MCP server to match.
   * `false` disables the relay. Vitest never starts it.
   */
  devToolsMcpPort?: number | false
  /**
   * Serve server-rendered pages from the Vite dev server, and, with
   * `ssr.build`, emit a Web `fetch` handler as the server bundle. When
   * set, `vite` passes HTML navigations that fall through Vite, plus
   * non-GET requests, to `renderPage` from the module at
   * `ssr.serverEntry`. When `undefined` (the default), the dev server
   * serves the client entry only.
   */
  ssr?: Omit<FoldkitSsrOptions, 'buildId' | 'quietStandDown'> &
    Readonly<{
      /**
       * Build a Web `fetch` handler alongside the browser build, and generate
       * static HTML from the server entry, inside this project's own
       * `vite build`. The handler is the server bundle: Node and Workers
       * both run it. `true` builds it with the default output directories
       * and generates nothing.
       *
       * When this is absent, `vite build` builds the browser bundle only.
       */
      build?: boolean | FoldkitBuildOptions
    }>
  /**
   * The deployment this build belongs to, compiled into application code as
   * `import.meta.env.FOLDKIT_BUILD_ID` for the entries to pass to
   * `renderToString` and `Runtime.hydrate`. Hydration compares it against the id
   * the server stamped and refuses a page from another deployment rather than
   * adopting it: startup stops and the page is contained, with the document's
   * body marked `inert`.
   *
   * Defaults to the `FOLDKIT_BUILD_ID` environment variable. Use a value the
   * deployment already has, such as a commit or a release tag, and give the
   * client build and the server build the same one. It is published in the
   * page, so it must not be a secret.
   *
   * Whatever supplies it has to answer with the same value every time it is
   * asked, because Vite reads a config file once per environment it builds. A
   * config that computes a fresh value on each read — `randomUUID()`, a
   * timestamp — gives the browser bundle and the server bundle different ids
   * within one build, and every page of that deployment is then refused at
   * hydration. Read it from the environment, or store a generated fallback
   * back into the environment so later reads resolve the same id.
   */
  buildId?: string
}>

// NOTE: Vite's dep optimizer scans the consumer's source for `effect`
// imports and pre-bundles only those exports into a single `effect.js`
// blob. It does not follow imports through workspace/node_modules
// packages, so any `effect` namespace foldkit's compiled dist references
// that the consumer does not mention by name is missing from the blob
// and crashes at runtime in dev. The list below covers every top-level
// namespace foldkit imports from bare `'effect'`. Over-inclusion is
// harmless; under-inclusion is the bug. Kept in sync with foldkit's
// source by `scripts/check-effect-prebundle.ts` (runs in `pnpm check`).
const FORCE_INCLUDED_EFFECT_NAMESPACES: ReadonlyArray<string> = [
  'effect/Array',
  'effect/Boolean',
  'effect/Cause',
  'effect/Clock',
  'effect/Context',
  'effect/Data',
  'effect/DateTime',
  'effect/Duration',
  'effect/Effect',
  'effect/Equal',
  'effect/Equivalence',
  'effect/Exit',
  'effect/Fiber',
  'effect/Function',
  'effect/Hash',
  'effect/HashMap',
  'effect/HashSet',
  'effect/Layer',
  'effect/Latch',
  'effect/Logger',
  'effect/Match',
  'effect/Number',
  'effect/Option',
  'effect/Order',
  'effect/Predicate',
  'effect/PubSub',
  'effect/Queue',
  'effect/Record',
  'effect/Ref',
  'effect/Result',
  'effect/Runtime',
  'effect/Scheduler',
  'effect/Schema',
  'effect/SchemaAST',
  'effect/SchemaIssue',
  'effect/SchemaTransformation',
  'effect/Scope',
  'effect/Stream',
  'effect/String',
  'effect/Struct',
  'effect/SubscriptionRef',
  'effect/Types',
]

// NOTE: a duplicate `foldkit` instance is its own hazard. If a bundler
// resolves `foldkit` (or a foldkit-consuming package like `@foldkit/ui`) to
// more than one copy, the copies get distinct Schema and tagged-message
// identities (decode and tag matching fail across the boundary) and separate
// module-level singleton state. `resolve.dedupe` (below) collapses every
// installed Foldkit package to one resolved copy.
const FOLDKIT_SINGLETON_PACKAGES: ReadonlyArray<string> = [
  'foldkit',
  '@foldkit/ui',
  '@foldkit/devtools',
]

// NOTE: `@foldkit/ui` and `@foldkit/devtools` are optional, so dedupe only
// the ones the consumer installed. An installed ESM package resolves to
// ERR_PACKAGE_PATH_NOT_EXPORTED rather than succeeding, so a missing package
// is signalled only by MODULE_NOT_FOUND.
const resolveInstalledFoldkitPackages = (root: string): Array<string> => {
  // NOTE: `root` (Vite's `config.root`) can be relative at config-hook time,
  // and createRequire requires an absolute path; `resolve` normalizes it.
  const requireFromRoot = createRequire(resolve(root, 'noop.js'))
  return Array.filter(FOLDKIT_SINGLETON_PACKAGES, packageName => {
    try {
      requireFromRoot.resolve(packageName)
      return true
    } catch (error) {
      return !(
        error instanceof Error &&
        Predicate.hasProperty(error, 'code') &&
        error.code === 'MODULE_NOT_FOUND'
      )
    }
  })
}

// EVENTS

type Event = Data.TaggedEnum<{
  PreserveModelReceived: { payload: unknown }
  RequestModelReceived: { payload: unknown }
  BrowserEventFrameReceived: { data: unknown; client: WebSocketClient }
  BrowserResponseFrameReceived: { data: unknown }
  ViteClientClosed: { client: WebSocketClient }
  HotUpdateFired: {}
  McpClientConnected: { client: WebSocket }
  McpClientDisconnected: { client: WebSocket }
  McpRequestReceived: { client: WebSocket; raw: string }
}>
const Event = Data.taggedEnum<Event>()

// STATE

type PreservedEntry = Readonly<{
  model: unknown
  isReloadFlush: boolean
}>

type State = Readonly<{
  preservedModels: Ref.Ref<HashMap.HashMap<string, PreservedEntry>>
  connectedRuntimes: Ref.Ref<HashMap.HashMap<string, typeof RuntimeInfo.Type>>
  mcpClients: Ref.Ref<HashSet.HashSet<WebSocket>>
  clientConnections: Ref.Ref<
    HashMap.HashMap<WebSocketClient, HashSet.HashSet<string>>
  >
  trackedClients: Ref.Ref<HashSet.HashSet<WebSocketClient>>
}>

const makeState = Effect.gen(function* () {
  const preservedModels = yield* Ref.make<
    HashMap.HashMap<string, PreservedEntry>
  >(HashMap.empty())
  const connectedRuntimes = yield* Ref.make<
    HashMap.HashMap<string, typeof RuntimeInfo.Type>
  >(HashMap.empty())
  const mcpClients = yield* Ref.make<HashSet.HashSet<WebSocket>>(
    HashSet.empty(),
  )
  const clientConnections = yield* Ref.make<
    HashMap.HashMap<WebSocketClient, HashSet.HashSet<string>>
  >(HashMap.empty())
  const trackedClients = yield* Ref.make<HashSet.HashSet<WebSocketClient>>(
    HashSet.empty(),
  )
  const state: State = {
    preservedModels,
    connectedRuntimes,
    mcpClients,
    clientConnections,
    trackedClients,
  }
  return state
})

const encodeResponseFrameJson = Schema.encodeUnknownSync(
  Schema.fromJsonString(ResponseFrame),
)

// HANDLERS

const handlePreserveModelReceived = (state: State, payload: unknown) =>
  Exit.match(Schema.decodeUnknownExit(PreserveModelMessage)(payload), {
    onFailure: error =>
      Console.warn(
        '[foldkit:preserve] failed to decode preserve-model payload',
        error,
      ),
    onSuccess: ({ id, model, isReloadFlush }) =>
      Ref.update(state.preservedModels, current => {
        const existingFlag = Option.exists(
          HashMap.get(current, id),
          ({ isReloadFlush }) => isReloadFlush,
        )
        const entry: PreservedEntry = {
          model,
          isReloadFlush: isReloadFlush === true || existingFlag,
        }
        return HashMap.set(current, id, entry)
      }),
  })

const handleRequestModelReceived = (
  server: ViteDevServer,
  state: State,
  payload: unknown,
) =>
  Exit.match(Schema.decodeUnknownExit(RequestModelMessage)(payload), {
    onFailure: error =>
      Console.warn(
        '[foldkit:preserve] failed to decode request-model payload',
        error,
      ),
    onSuccess: ({ id }) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(state.preservedModels)
        const sendRestore = (model: unknown) =>
          Effect.sync(() =>
            server.ws.send(
              'foldkit:restore-model',
              Schema.encodeUnknownSync(RestoreModelMessage)(
                RestoreModelMessage.make({ id, model }),
              ),
            ),
          )
        yield* Option.match(HashMap.get(current, id), {
          onNone: () => sendRestore(undefined),
          onSome: entry => {
            if (entry.isReloadFlush) {
              const served: PreservedEntry = { ...entry, isReloadFlush: false }
              return Ref.update(
                state.preservedModels,
                HashMap.set(id, served),
              ).pipe(Effect.flatMap(() => sendRestore(entry.model)))
            }
            return Ref.update(state.preservedModels, HashMap.remove(id)).pipe(
              Effect.flatMap(() => sendRestore(undefined)),
            )
          },
        })
      }),
  })

const handleHotUpdateFired = (state: State) =>
  Ref.update(state.preservedModels, current =>
    HashMap.map(current, entry => ({ ...entry, isReloadFlush: true })),
  )

const handleBrowserEventFrameReceived = (
  state: State,
  data: unknown,
  client: WebSocketClient,
) =>
  Exit.match(Schema.decodeUnknownExit(EventFrame)(data), {
    onFailure: error =>
      Console.warn(
        '[foldkit:devTools] failed to decode browser event frame',
        error,
      ),
    onSuccess: frame =>
      DevToolsEvent.match(frame.event, {
        EventConnected: event => handleConnectedEvent(state, event, client),
        EventDisconnected: event => handleDisconnectedEvent(state, event),
      }),
  })

const handleConnectedEvent = (
  state: State,
  event: typeof DevToolsEvent.EventConnected.Type,
  client: WebSocketClient,
) =>
  Effect.gen(function* () {
    yield* Ref.update(
      state.connectedRuntimes,
      HashMap.set(event.runtime.connectionId, event.runtime),
    )
    yield* Ref.update(state.clientConnections, currentMap => {
      const existing = HashMap.get(currentMap, client).pipe(
        Option.getOrElse(() => HashSet.empty<string>()),
      )
      return HashMap.set(
        currentMap,
        client,
        HashSet.add(existing, event.runtime.connectionId),
      )
    })
    yield* Console.log(
      `[foldkit:devTools] runtime connected: ${event.runtime.connectionId} (${event.runtime.title})`,
    )
  })

const handleDisconnectedEvent = (
  state: State,
  event: typeof DevToolsEvent.EventDisconnected.Type,
) =>
  Effect.gen(function* () {
    yield* Ref.update(
      state.connectedRuntimes,
      HashMap.remove(event.connectionId),
    )
    yield* Console.log(
      `[foldkit:devTools] runtime disconnected: ${event.connectionId}`,
    )
  })

const pruneRuntime = (state: State, connectionId: string) =>
  Effect.gen(function* () {
    yield* Ref.update(state.connectedRuntimes, HashMap.remove(connectionId))
    yield* Console.log(
      `[foldkit:devTools] runtime pruned (socket close): ${connectionId}`,
    )
  })

const pruneRuntimesForClient = (
  state: State,
  connectionIds: HashSet.HashSet<string>,
) =>
  Effect.forEach(
    Array.fromIterable(connectionIds),
    connectionId => pruneRuntime(state, connectionId),
    { discard: true },
  )

const handleViteClientClosed = (state: State, client: WebSocketClient) =>
  Effect.gen(function* () {
    const connections = yield* Ref.get(state.clientConnections)
    yield* Option.match(HashMap.get(connections, client), {
      onNone: () => Effect.void,
      onSome: connectionIds => pruneRuntimesForClient(state, connectionIds),
    })
    yield* Ref.update(state.clientConnections, HashMap.remove(client))
    yield* Ref.update(state.trackedClients, HashSet.remove(client))
  })

const handleBrowserResponseFrameReceived = (state: State, data: unknown) =>
  Exit.match(Schema.decodeUnknownExit(ResponseFrame)(data), {
    onFailure: error =>
      Console.warn(
        '[foldkit:devTools] failed to decode browser response frame',
        error,
      ),
    onSuccess: frame => broadcastResponseToMcpClients(state, frame),
  })

const broadcastResponseToMcpClients = (
  state: State,
  frame: typeof ResponseFrame.Type,
) =>
  Effect.gen(function* () {
    const clients = yield* Ref.get(state.mcpClients)
    const payload = encodeResponseFrameJson(frame)
    yield* Effect.sync(() => {
      for (const client of clients) {
        if (client.readyState === client.OPEN) {
          client.send(payload)
        }
      }
    })
  })

const handleMcpClientConnected = (state: State, client: WebSocket) =>
  Effect.gen(function* () {
    yield* Ref.update(state.mcpClients, HashSet.add(client))
    const total = HashSet.size(yield* Ref.get(state.mcpClients))
    yield* Console.log(
      `[foldkit:devTools] MCP client connected (${total} total)`,
    )
  })

const handleMcpClientDisconnected = (state: State, client: WebSocket) =>
  Effect.gen(function* () {
    yield* Ref.update(state.mcpClients, HashSet.remove(client))
    const remaining = HashSet.size(yield* Ref.get(state.mcpClients))
    yield* Console.log(
      `[foldkit:devTools] MCP client disconnected (${remaining} remaining)`,
    )
  })

const handleMcpRequestReceived = (
  server: ViteDevServer,
  state: State,
  client: WebSocket,
  raw: string,
) =>
  Exit.match(
    Schema.decodeUnknownExit(Schema.fromJsonString(RequestFrame))(raw),
    {
      onFailure: error =>
        Console.warn(
          '[foldkit:devTools] failed to decode MCP request frame',
          error,
        ),
      onSuccess: frame =>
        Match.value(frame.request).pipe(
          Match.tag('RequestListRuntimes', () =>
            replyListRuntimes(state, client, frame.id),
          ),
          Match.orElse(() => forwardRequestToBrowsers(server, frame)),
        ),
    },
  )

const replyListRuntimes = (
  state: State,
  client: WebSocket,
  requestId: string,
) =>
  Effect.gen(function* () {
    const runtimes = pipe(
      yield* Ref.get(state.connectedRuntimes),
      HashMap.values,
      Array.fromIterable,
    )
    const responseFrame = {
      id: requestId,
      response: Response.ResponseRuntimes({ runtimes }),
    }
    yield* Effect.sync(() => {
      if (client.readyState === client.OPEN) {
        client.send(encodeResponseFrameJson(responseFrame))
      }
    })
  })

const forwardRequestToBrowsers = (
  server: ViteDevServer,
  frame: typeof RequestFrame.Type,
) =>
  Effect.sync(() =>
    server.ws.send(
      'foldkit:devTools:request',
      Schema.encodeUnknownSync(RequestFrame)(frame),
    ),
  )

// EVENT DISPATCH

const dispatchEvent = (server: ViteDevServer, state: State, event: Event) =>
  Match.value(event).pipe(
    Match.tagsExhaustive({
      PreserveModelReceived: ({ payload }) =>
        handlePreserveModelReceived(state, payload),
      RequestModelReceived: ({ payload }) =>
        handleRequestModelReceived(server, state, payload),
      BrowserEventFrameReceived: ({ data, client }) =>
        handleBrowserEventFrameReceived(state, data, client),
      BrowserResponseFrameReceived: ({ data }) =>
        handleBrowserResponseFrameReceived(state, data),
      ViteClientClosed: ({ client }) => handleViteClientClosed(state, client),
      HotUpdateFired: () => handleHotUpdateFired(state),
      McpClientConnected: ({ client }) =>
        handleMcpClientConnected(state, client),
      McpClientDisconnected: ({ client }) =>
        handleMcpClientDisconnected(state, client),
      McpRequestReceived: ({ client, raw }) =>
        handleMcpRequestReceived(server, state, client, raw),
    }),
  )

// VITE WS BRIDGE

const ensureClientTracked = (
  state: State,
  client: WebSocketClient,
  enqueue: (event: Event) => void,
) =>
  Effect.gen(function* () {
    const tracked = yield* Ref.get(state.trackedClients)
    if (HashSet.has(tracked, client)) {
      return
    }
    yield* Ref.update(state.trackedClients, HashSet.add(client))
    yield* Effect.sync(() =>
      client.socket.on('close', () =>
        enqueue(Event.ViteClientClosed({ client })),
      ),
    )
  })

const registerViteWsHandlers = (
  server: ViteDevServer,
  state: State,
  enqueue: (event: Event) => void,
) =>
  Effect.sync(() => {
    server.ws.on('foldkit:preserve-model', payload =>
      enqueue(Event.PreserveModelReceived({ payload })),
    )
    server.ws.on('foldkit:request-model', payload =>
      enqueue(Event.RequestModelReceived({ payload })),
    )
    server.ws.on(
      'foldkit:devTools:event',
      (data: unknown, client: WebSocketClient) => {
        Effect.runFork(ensureClientTracked(state, client, enqueue))
        enqueue(Event.BrowserEventFrameReceived({ data, client }))
      },
    )
    server.ws.on('foldkit:devTools:response', (data: unknown) =>
      enqueue(Event.BrowserResponseFrameReceived({ data })),
    )
  })

// MCP RELAY

// NOTE: Vite starts a replacement server before closing the old one. A
// configured relay port can stay occupied during the overlap, so binding
// retries for four seconds.
const RELAY_BIND_RETRY_DELAY = Duration.millis(100)
const RELAY_BIND_RETRY_COUNT = 40
const RELAY_PATH = '/__foldkit/devtools-mcp'
const RELAY_LOOPBACK_HOST = '127.0.0.1'
const RELAY_CONFIGURED_PORT_HOST = 'localhost'
const RELAY_TOKEN_PARAMETER = 'token'
const RELAY_TOKEN_BYTES = 32

class RelayBindFailed extends Data.TaggedError('RelayBindFailed')<{
  readonly maybePort: Option.Option<number>
  readonly cause: Error
}> {}

const isPortInUse = (error: Error) =>
  Predicate.hasProperty(error, 'code') && error.code === 'EADDRINUSE'

type Relay = Readonly<{
  id: string
  wss: WebSocketServer
  url: string
  detach: () => void
}>

const relayId = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto
  return yield* crypto.randomUUIDv4.pipe(Effect.orDie)
})

const attachRelayHandlers = (
  wss: WebSocketServer,
  enqueue: (event: Event) => void,
): void => {
  wss.on('connection', client => {
    enqueue(Event.McpClientConnected({ client }))
    client.on('message', raw =>
      enqueue(Event.McpRequestReceived({ client, raw: raw.toString() })),
    )
    client.on('close', () => enqueue(Event.McpClientDisconnected({ client })))
    client.on('error', error => {
      console.error('[foldkit:devTools] MCP client error', error)
    })
  })
}

const parseRequestUrl = Option.liftThrowable(
  (request: IncomingMessage) => new URL(request.url ?? '/', 'http://relay'),
)

const boundPort = (
  address: AddressInfo | string | null,
): Option.Option<number> =>
  address === null || Predicate.isString(address)
    ? Option.none()
    : Option.some(address.port)

const relayHasNoBoundPort = () =>
  new Error('[foldkit:devTools] the MCP relay listener has no bound port')

const relayToken = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto
  const bytes = yield* crypto.randomBytes(RELAY_TOKEN_BYTES).pipe(Effect.orDie)
  return Buffer.from(bytes).toString('hex')
})

const relayUrlForLog = (url: string): string => {
  const parsed = new URL(url)
  parsed.search = ''
  return parsed.toString()
}

const withRelayToken = (url: URL, token: string): string => {
  url.search = ''
  url.searchParams.set(RELAY_TOKEN_PARAMETER, token)
  return url.toString()
}

const requestPresentsToken = (url: URL, token: string): boolean => {
  const maybePresented = Option.fromNullishOr(
    url.searchParams.get(RELAY_TOKEN_PARAMETER),
  )
  const expected = Buffer.from(token, 'utf8')
  return Option.exists(maybePresented, presented => {
    const actual = Buffer.from(presented, 'utf8')
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    )
  })
}

const refuseUpgrade = (socket: Duplex): void => {
  socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
  socket.destroy()
}

// NOTE: Vite resolves `server.resolvedUrls` in a listener it prepends to
// `listening`, so they are set by the time the relay's own listener runs.
const hostedRelayUrl =
  (server: ViteDevServer, token: string) =>
  (httpServer: HttpServer): string => {
    const maybeResolvedUrl = pipe(
      Option.fromNullishOr(server.resolvedUrls),
      Option.flatMap(resolvedUrls =>
        Option.orElse(Array.head(resolvedUrls.local), () =>
          Array.head(resolvedUrls.network),
        ),
      ),
    )
    const url = new URL(
      pipe(
        maybeResolvedUrl,
        Option.orElse(() =>
          Option.map(
            boundPort(httpServer.address()),
            port => `http://${RELAY_LOOPBACK_HOST}:${port}/`,
          ),
        ),
        Option.getOrThrowWith(relayHasNoBoundPort),
      ),
    )
    url.protocol = 'ws:'
    url.pathname = RELAY_PATH
    return withRelayToken(url, token)
  }

const loopbackRelayUrl =
  (token: string) =>
  (httpServer: HttpServer): string => {
    const port = Option.getOrThrowWith(
      boundPort(httpServer.address()),
      relayHasNoBoundPort,
    )
    const url = new URL(`ws://${RELAY_LOOPBACK_HOST}:${port}${RELAY_PATH}`)
    return withRelayToken(url, token)
  }

const hostRelayOnServer = (
  httpServer: HttpServer,
  id: string,
  token: string,
  toUrl: (httpServer: HttpServer) => string,
  enqueue: (event: Event) => void,
) =>
  Effect.callback<Relay>(resume => {
    const wss = new WebSocketServer({ noServer: true })
    attachRelayHandlers(wss, enqueue)

    const onUpgrade = (
      request: IncomingMessage,
      socket: Duplex,
      head: Buffer,
    ): void => {
      const maybeUrl = parseRequestUrl(request)
      if (Option.isNone(maybeUrl)) {
        socket.destroy()
        return
      }

      const url = maybeUrl.value
      if (url.pathname !== RELAY_PATH) {
        return
      }

      if (!requestPresentsToken(url, token)) {
        refuseUpgrade(socket)
        return
      }

      wss.handleUpgrade(request, socket, head, client => {
        wss.emit('connection', client, request)
      })
    }

    httpServer.on('upgrade', onUpgrade)

    const detach = (): void => {
      httpServer.off('upgrade', onUpgrade)
      httpServer.off('listening', onListening)
    }

    const onListening = (): void => {
      resume(Effect.sync(() => ({ id, wss, url: toUrl(httpServer), detach })))
    }

    if (httpServer.listening) {
      onListening()
    } else {
      httpServer.once('listening', onListening)
    }

    return Effect.sync(detach)
  })

const bindLoopbackHttpServer = Effect.callback<HttpServer, RelayBindFailed>(
  resume => {
    const httpServer = createHttpServer()
    const onBindFailed = (cause: Error) => {
      httpServer.close()

      resume(
        Effect.fail(new RelayBindFailed({ maybePort: Option.none(), cause })),
      )
    }

    httpServer.once('error', onBindFailed)

    httpServer.listen(0, RELAY_LOOPBACK_HOST, () => {
      httpServer.off('error', onBindFailed)

      httpServer.on('error', error => {
        console.error('[foldkit:devTools] MCP relay error', error)
      })

      resume(Effect.succeed(httpServer))
    })

    return Effect.sync(() => {
      httpServer.close()
    })
  },
)

const bindLoopbackRelay = (
  id: string,
  token: string,
  enqueue: (event: Event) => void,
) =>
  Effect.gen(function* () {
    const httpServer = yield* bindLoopbackHttpServer
    const relay = yield* hostRelayOnServer(
      httpServer,
      id,
      token,
      loopbackRelayUrl(token),
      enqueue,
    )
    return {
      ...relay,
      detach: () => {
        relay.detach()
        httpServer.close()
      },
    }
  })

const bindStandaloneRelay = (
  port: number,
  id: string,
  enqueue: (event: Event) => void,
) =>
  Effect.callback<Relay, RelayBindFailed>(resume => {
    const wss = new WebSocketServer({ port })
    attachRelayHandlers(wss, enqueue)

    const onListening = () => {
      wss.off('error', onBindFailed)
      wss.on('error', error => {
        console.error('[foldkit:devTools] MCP relay error', error)
      })
      const listeningPort = Option.getOrThrowWith(
        boundPort(wss.address()),
        relayHasNoBoundPort,
      )
      resume(
        Effect.succeed({
          id,
          wss,
          url: `ws://${RELAY_CONFIGURED_PORT_HOST}:${listeningPort}`,
          detach: () => undefined,
        }),
      )
    }

    const onBindFailed = (cause: Error) => {
      wss.off('listening', onListening)
      wss.close()
      resume(
        Effect.fail(
          new RelayBindFailed({ maybePort: Option.some(port), cause }),
        ),
      )
    }

    wss.once('listening', onListening)
    wss.once('error', onBindFailed)
  })

const reportRelayBindFailed = (
  maybePort: Option.Option<number>,
  cause: Error,
) => {
  const where = Option.match(maybePort, {
    onNone: () => 'an assigned loopback port',
    onSome: port => `port ${port}`,
  })
  if (Option.isSome(maybePort) && isPortInUse(cause)) {
    const port = maybePort.value
    return Console.error(
      `\n[foldkit:devTools] Port ${port} is in use; the MCP relay did not start.\n` +
        `[foldkit:devTools] Stop the process using that port, or remove \`devToolsMcpPort\` from your Vite config to use automatic discovery.\n` +
        `[foldkit:devTools] If you choose another fixed port, set \`FOLDKIT_DEVTOOLS_MCP_PORT\` to match.\n`,
    )
  } else {
    return Console.error(
      `[foldkit:devTools] MCP relay failed to start on ${where}; continuing without the relay`,
      cause,
    )
  }
}

const unpublishedRelayMessage = (reason: string): string =>
  `[foldkit:devTools] Cannot publish the MCP relay address: ${reason}. Set matching devToolsMcpPort and FOLDKIT_DEVTOOLS_MCP_PORT values for MCP access, or set FOLDKIT_DEVTOOLS_RELAY_DIRECTORY to a private directory on a platform that verifies ownership.`

const publishRelay = (root: string, relay: Relay) =>
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    yield* publishRelayRecord({
      version: RELAY_RECORD_VERSION,
      id: relay.id,
      root,
      url: relay.url,
      pid: process.pid,
      startedAt,
    })
  }).pipe(
    Effect.catchTag('RelayRegistryDirectoryRefused', ({ directory, reason }) =>
      Console.error(
        unpublishedRelayMessage(
          `the registry directory ${directory} ${reason}`,
        ),
      ),
    ),
    Effect.catch(error =>
      Console.error(
        unpublishedRelayMessage('the registry could not be written'),
        error,
      ),
    ),
  )

const startMcpRelay = (
  server: ViteDevServer,
  devToolsMcpPort: number | undefined,
  enqueue: (event: Event) => void,
) => {
  const root = server.config.root
  // NOTE: The MCP server cannot verify a development HTTPS certificate, so
  // HTTPS uses a separate loopback listener.
  const maybeHttpServer = Option.filter(
    Option.fromNullishOr(server.httpServer),
    () => server.config.server.https === undefined,
  )
  // NOTE: A configured port keeps the previous unauthenticated behavior.
  // An assigned port binds only to loopback and is found through the registry.
  const acquire: Effect.Effect<Relay, RelayBindFailed, Crypto.Crypto> =
    Effect.gen(function* () {
      const id = yield* relayId
      if (devToolsMcpPort !== undefined) {
        return yield* bindStandaloneRelay(devToolsMcpPort, id, enqueue)
      }

      const token = yield* relayToken
      return yield* Option.match(maybeHttpServer, {
        onNone: () => bindLoopbackRelay(id, token, enqueue),
        onSome: httpServer =>
          hostRelayOnServer(
            httpServer,
            id,
            token,
            hostedRelayUrl(server, token),
            enqueue,
          ),
      })
    })
  return Effect.acquireRelease(
    acquire.pipe(
      Effect.tap(relay =>
        Console.log(
          `[foldkit:devTools] MCP relay listening at ${relayUrlForLog(relay.url)}`,
        ),
      ),
      Effect.tap(relay => publishRelay(root, relay)),
    ),
    relay =>
      Effect.gen(function* () {
        relay.detach()
        for (const client of relay.wss.clients) {
          client.terminate()
        }
        relay.wss.close()
        yield* retireRelayRecord(root, relay.id)
        yield* Console.log('[foldkit:devTools] MCP relay stopped')
      }),
  ).pipe(
    Effect.retry({
      while: ({ cause }) => isPortInUse(cause),
      times: RELAY_BIND_RETRY_COUNT,
      schedule: Schedule.spaced(RELAY_BIND_RETRY_DELAY),
    }),
    Effect.catchTag('RelayBindFailed', ({ maybePort, cause }) =>
      reportRelayBindFailed(maybePort, cause),
    ),
  )
}

// NOTE: A Vitest run can override its mode, but still carries Vitest plugins.
// Starting a relay there can contend with the project's dev server.
const isTestRun = (server: ViteDevServer): boolean =>
  server.config.mode === 'test' ||
  server.config.plugins.some(
    plugin => plugin.name === 'vitest' || plugin.name.startsWith('vitest:'),
  )

// PROGRAM

const main = (
  server: ViteDevServer,
  events: Queue.Queue<Event>,
  options: FoldkitPluginOptions,
) =>
  Effect.gen(function* () {
    const state = yield* makeState
    const enqueue = (event: Event): void => {
      Queue.offerUnsafe(events, event)
    }

    yield* registerViteWsHandlers(server, state, enqueue)

    // NOTE: Forked rather than awaited because binding the relay can retry for
    // seconds. Model preservation is independent of the relay, and the runtime
    // gives up on its boot-time model request in well under a second, so
    // sequencing the dispatch loop behind the bind would cost model
    // preservation whenever the port is contended.
    if (options.devToolsMcpPort !== false && !isTestRun(server)) {
      yield* Effect.forkScoped(
        startMcpRelay(server, options.devToolsMcpPort, enqueue),
      )
    }

    yield* Stream.fromQueue(events).pipe(
      Stream.runForEach(event => dispatchEvent(server, state, event)),
    )
  })

// PLUGIN ENTRY

/**
 * Foldkit's Vite plugin set: the view-identity branding transform and
 * DevTools overlay injection (dev and build), plus Model preservation across
 * reloads and the optional DevTools MCP relay (dev only). Returned as
 * an array; Vite flattens nested plugin arrays, so `plugins: [foldkit()]`
 * keeps working.
 */
// The container is named once, on `ssr`, and reaches both the dev host and the
// build from there. A `build.prerender` that names its own wins, so a project
// that needs them to differ still can.
const withContainerId = (
  build: FoldkitBuildOptions | true,
  containerId: string | undefined,
): FoldkitBuildOptions => {
  const options: FoldkitBuildOptions = build === true ? {} : build
  if (containerId === undefined) {
    return options
  }
  const withContainer: FoldkitBuildOptions = { ...options, containerId }
  if (options.prerender === undefined) {
    return withContainer
  }
  const prerender = options.prerender === true ? {} : options.prerender
  if (prerender === false) {
    return withContainer
  }
  return {
    ...withContainer,
    prerender: { containerId, ...prerender },
  }
}

const relayRegistryLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  NodePath.layer,
  NodeCrypto.layer,
)

type MainRun = Readonly<{
  events: Queue.Queue<Event>
  fiber: Fiber.Fiber<void, never>
}>

export const foldkit = (options: FoldkitPluginOptions = {}): Array<Plugin> => {
  // NOTE: During a Vite restart, old and new servers overlap. Separate queues
  // and fibers keep their events and shutdowns attached to the right server.
  const mainRuns = new WeakMap<ResolvedConfig, MainRun>()

  const stopMain = (config: ResolvedConfig) =>
    Effect.suspend(() => {
      const run = mainRuns.get(config)
      mainRuns.delete(config)
      if (run === undefined) {
        return Effect.void
      } else {
        return Fiber.interrupt(run.fiber)
      }
    })

  const reloadPlugin: Plugin = {
    name: 'foldkit',
    apply: 'serve',
    config: userConfig => ({
      optimizeDeps: {
        include: [...FORCE_INCLUDED_EFFECT_NAMESPACES],
      },
      resolve: {
        dedupe: resolveInstalledFoldkitPackages(
          userConfig.root ?? process.cwd(),
        ),
      },
    }),
    configureServer: server => {
      const events = Effect.runSync(Queue.unbounded<Event>())
      // NOTE: The default ConfigProvider snapshots the environment. Create a
      // fresh one so a restarted server sees current values.
      const fiber = Effect.runFork(
        Effect.scoped(main(server, events, options)).pipe(
          Effect.provide(relayRegistryLayer),
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv(),
          ),
        ),
      )
      mainRuns.set(server.config, { events, fiber })
    },
    // NOTE: Middleware mode has no HTTP server to close. Vite still calls
    // `closeBundle`, so relay cleanup belongs here.
    closeBundle() {
      return Effect.runPromise(stopMain(this.environment.getTopLevelConfig()))
    },
    handleHotUpdate: ({
      server,
      modules,
    }: {
      server: ViteDevServer
      modules: ReadonlyArray<unknown>
    }) => {
      if (modules.length === 0) {
        return
      }
      server.ws.send({ type: 'full-reload' })
      const run = mainRuns.get(server.config)
      if (run !== undefined) {
        Queue.offerUnsafe(run.events, Event.HotUpdateFired())
      }
      return []
    },
  }

  const shared = [
    foldkitBuildToken(options.buildId),
    foldkitViewIdentity(),
    devToolsOverlayPlugin(),
    reloadPlugin,
  ]

  if (options.ssr === undefined) {
    return shared
  }

  const { build, ...ssr } = options.ssr
  const servePages = foldkitSsr({
    ...ssr,
    ...(options.buildId === undefined ? {} : { buildId: options.buildId }),
    quietStandDown: build !== undefined && build !== false,
  })

  if (build === undefined || build === false) {
    return [...shared, servePages]
  }

  return [
    ...shared,
    servePages,
    foldkitBuild(ssr.serverEntry, withContainerId(build, ssr.containerId)),
  ]
}
