import {
  Array,
  Console,
  Data,
  Duration,
  Effect,
  Exit,
  Fiber,
  HashMap,
  HashSet,
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
import type {
  Plugin,
  ResolvedConfig,
  ViteDevServer,
  WebSocketClient,
} from 'vite'
import { type WebSocket, WebSocketServer } from 'ws'

import { type FoldkitBuildOptions, foldkitBuild } from './build.js'
import { foldkitBuildToken } from './buildToken.js'
import { devToolsOverlayPlugin } from './devToolsOverlay.js'
import { resolveInstalledFoldkitPackages } from './foldkitPackages.js'
import { type FoldkitSsrOptions, foldkitSsr } from './ssr.js'
import { foldkitViewIdentity } from './viewIdentity.js'

export { type BrandDistResult, brandDistDirectory } from './brandDist.js'
export {
  FOLDKIT_FETCH_MODULE_ID,
  FoldkitBuildManifest,
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
   * Port for the WebSocket server that exposes the DevTools relay to an
   * external MCP server. When `undefined` (the default), no MCP relay is
   * started. When set, the plugin listens on this port for connections from
   * the Foldkit DevTools MCP server.
   */
  devToolsMcpPort?: number
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
   * An explicit identity for the deployment this build belongs to. Foldkit
   * normally generates an opaque identity when one Vite app build coordinates
   * the client and server artifacts, then compiles it into the framework in
   * both. Hydration compares that value against the id the server stamped and
   * refuses a page from another deployment before adopting its DOM.
   *
   * Set this when the client and server are built separately, or when the id
   * should name a deployment in another system. The `FOLDKIT_BUILD_ID`
   * environment variable supplies the same override when this option is
   * absent. Give every artifact the same value. It is published in the page,
   * so it must not be a secret.
   *
   * Reusing an override across deployments makes stale pages appear current.
   * Use a value that changes whenever the deployment's rendering inputs can
   * change.
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

// NOTE: Restarting a dev server briefly leaves two of them alive. Vite builds
// the replacement, which binds its relay, before closing the server it
// replaces, which still owns the port. The bind loses that race and has to
// wait for the outgoing server to release the port, so it retries for four
// seconds before reporting the port as taken.
const RELAY_BIND_RETRY_DELAY = Duration.millis(100)
const RELAY_BIND_RETRY_COUNT = 40

class RelayBindFailed extends Data.TaggedError('RelayBindFailed')<{
  readonly cause: Error
}> {}

const isPortInUse = (error: Error) =>
  Predicate.hasProperty(error, 'code') && error.code === 'EADDRINUSE'

const bindMcpRelay = (port: number, enqueue: (event: Event) => void) =>
  Effect.callback<WebSocketServer, RelayBindFailed>(resume => {
    const wss = new WebSocketServer({ port })

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

    const onListening = () => {
      wss.off('error', onBindFailed)
      wss.on('error', error => {
        console.error('[foldkit:devTools] MCP relay error', error)
      })
      console.log(
        `[foldkit:devTools] MCP relay listening on ws://localhost:${port}`,
      )
      resume(Effect.succeed(wss))
    }

    const onBindFailed = (cause: Error) => {
      wss.off('listening', onListening)
      wss.close()
      resume(Effect.fail(new RelayBindFailed({ cause })))
    }

    wss.once('listening', onListening)
    wss.once('error', onBindFailed)
  })

const reportRelayBindFailed = (port: number, cause: Error) => {
  if (isPortInUse(cause)) {
    return Console.error(
      `\n[foldkit:devTools] Port ${port} is already in use, so the DevTools MCP relay could not start.\n` +
        `[foldkit:devTools] This usually means another Foldkit project is already running and bound to this port.\n` +
        `[foldkit:devTools] Until the port is freed, agents will not be able to connect to this app via the Foldkit DevTools MCP server.\n` +
        `[foldkit:devTools] Stop the other project, or set a different \`devToolsMcpPort\` in this project's vite config.\n` +
        `[foldkit:devTools] If you change \`devToolsMcpPort\`, also set \`FOLDKIT_DEVTOOLS_MCP_PORT\` to the same value for your MCP server.\n`,
    )
  } else {
    return Console.error(
      `[foldkit:devTools] MCP relay failed to start on port ${port}; continuing without the relay`,
      cause,
    )
  }
}

const startMcpRelay = (port: number, enqueue: (event: Event) => void) =>
  Effect.acquireRelease(bindMcpRelay(port, enqueue), wss =>
    Effect.gen(function* () {
      for (const client of wss.clients) {
        client.terminate()
      }
      wss.close()
      yield* Console.log('[foldkit:devTools] MCP relay stopped')
    }),
  ).pipe(
    Effect.retry({
      while: ({ cause }) => isPortInUse(cause),
      times: RELAY_BIND_RETRY_COUNT,
      schedule: Schedule.spaced(RELAY_BIND_RETRY_DELAY),
    }),
    Effect.catchTag('RelayBindFailed', ({ cause }) =>
      reportRelayBindFailed(port, cause),
    ),
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
    if (options.devToolsMcpPort !== undefined) {
      yield* Effect.forkScoped(startMcpRelay(options.devToolsMcpPort, enqueue))
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

export const foldkit = (options: FoldkitPluginOptions = {}): Array<Plugin> => {
  const events = Effect.runSync(Queue.unbounded<Event>())

  // NOTE: One plugin instance can serve more than one dev server, and on
  // restart Vite builds the replacement, running `configureServer` again,
  // before closing the server being replaced. Keying by resolved config keeps
  // each server's shutdown pointed at its own fiber.
  const mainFibers = new WeakMap<ResolvedConfig, Fiber.Fiber<void, never>>()

  const stopMain = (config: ResolvedConfig) =>
    Effect.suspend(() => {
      const fiber = mainFibers.get(config)
      mainFibers.delete(config)
      if (fiber === undefined) {
        return Effect.void
      } else {
        return Fiber.interrupt(fiber)
      }
    })

  const reloadPlugin: Plugin = {
    name: 'foldkit',
    apply: 'serve',
    config: () => ({
      optimizeDeps: {
        include: [...FORCE_INCLUDED_EFFECT_NAMESPACES],
      },
    }),
    configureServer: server => {
      const fiber = Effect.runFork(Effect.scoped(main(server, events, options)))
      mainFibers.set(server.config, fiber)
    },
    // NOTE: Vite awaits `closeBundle` when the dev server closes, once per
    // environment plugin container. Hanging shutdown off `server.httpServer`
    // instead would never run in middleware mode, which is how Vitest and
    // other embedders run Vite, and the relay would outlive the server.
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
      Queue.offerUnsafe(events, Event.HotUpdateFired())
      return []
    },
  }

  const resolutionPlugin: Plugin = {
    name: 'foldkit:resolution',
    config: userConfig => {
      const singletonPackages = resolveInstalledFoldkitPackages(
        userConfig.root ?? process.cwd(),
      )

      return {
        optimizeDeps: {
          exclude: ['foldkit'],
        },
        resolve: {
          dedupe: singletonPackages,
        },
        ssr: {
          noExternal: singletonPackages,
        },
        environments: {
          ssr: {
            resolve: {
              noExternal: singletonPackages,
            },
          },
        },
      }
    },
  }

  const shared = [
    resolutionPlugin,
    ...foldkitBuildToken(options.buildId),
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
