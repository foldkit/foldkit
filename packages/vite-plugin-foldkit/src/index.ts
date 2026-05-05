import {
  Array,
  Console,
  Data,
  Effect,
  Exit,
  Fiber,
  HashMap,
  HashSet,
  Match as M,
  Option,
  Queue,
  Ref,
  Schema as S,
  Stream,
  pipe,
} from 'effect'
import {
  type EventConnected,
  type EventDisconnected,
  EventFrame,
  RequestFrame,
  ResponseFrame,
  ResponseRuntimes,
  type RuntimeInfo,
} from 'foldkit/devtools-protocol'
import {
  PreserveModelMessage,
  RequestModelMessage,
  RestoreModelMessage,
} from 'foldkit/hmr-protocol'
import type { Plugin, ViteDevServer, WebSocketClient } from 'vite'
import { type WebSocket, WebSocketServer } from 'ws'

/** Options for the `foldkit` Vite plugin. */
export type FoldkitPluginOptions = Readonly<{
  /**
   * Port for the WebSocket server that exposes the DevTools relay to an
   * external MCP server. When `undefined` (the default), no MCP relay is
   * started. When set, the plugin listens on this port for connections from
   * the Foldkit DevTools MCP server.
   */
  devToolsMcpPort?: number
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
  'effect/Scheduler',
  'effect/Schema',
  'effect/SchemaIssue',
  'effect/SchemaTransformation',
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
  isHmrReload: boolean
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

const encodeResponseFrameJson = S.encodeUnknownSync(
  S.fromJsonString(ResponseFrame),
)

// HANDLERS

const handlePreserveModelReceived = (state: State, payload: unknown) =>
  Exit.match(S.decodeUnknownExit(PreserveModelMessage)(payload), {
    onFailure: error =>
      Console.warn(
        '[foldkit:hmr] failed to decode preserve-model payload',
        error,
      ),
    onSuccess: ({ id, model, isHmrReload }) =>
      Ref.update(state.preservedModels, current => {
        const existingFlag = Option.exists(
          HashMap.get(current, id),
          ({ isHmrReload }) => isHmrReload,
        )
        const entry: PreservedEntry = {
          model,
          isHmrReload: isHmrReload === true || existingFlag,
        }
        return HashMap.set(current, id, entry)
      }),
  })

const handleRequestModelReceived = (
  server: ViteDevServer,
  state: State,
  payload: unknown,
) =>
  Exit.match(S.decodeUnknownExit(RequestModelMessage)(payload), {
    onFailure: error =>
      Console.warn(
        '[foldkit:hmr] failed to decode request-model payload',
        error,
      ),
    onSuccess: ({ id }) =>
      Effect.gen(function* () {
        const current = yield* Ref.get(state.preservedModels)
        const sendRestore = (model: unknown) =>
          Effect.sync(() =>
            server.ws.send(
              'foldkit:restore-model',
              S.encodeUnknownSync(RestoreModelMessage)(
                RestoreModelMessage.make({ id, model }),
              ),
            ),
          )
        yield* Option.match(HashMap.get(current, id), {
          onNone: () => sendRestore(undefined),
          onSome: entry => {
            if (entry.isHmrReload) {
              const served: PreservedEntry = { ...entry, isHmrReload: false }
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
    HashMap.map(current, entry => ({ ...entry, isHmrReload: true })),
  )

const handleBrowserEventFrameReceived = (
  state: State,
  data: unknown,
  client: WebSocketClient,
) =>
  Exit.match(S.decodeUnknownExit(EventFrame)(data), {
    onFailure: error =>
      Console.warn(
        '[foldkit:devTools] failed to decode browser event frame',
        error,
      ),
    onSuccess: frame =>
      M.value(frame.event).pipe(
        M.tagsExhaustive({
          EventConnected: event => handleConnectedEvent(state, event, client),
          EventDisconnected: event => handleDisconnectedEvent(state, event),
        }),
      ),
  })

const handleConnectedEvent = (
  state: State,
  event: typeof EventConnected.Type,
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
  event: typeof EventDisconnected.Type,
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
  Exit.match(S.decodeUnknownExit(ResponseFrame)(data), {
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
  Exit.match(S.decodeUnknownExit(S.fromJsonString(RequestFrame))(raw), {
    onFailure: error =>
      Console.warn(
        '[foldkit:devTools] failed to decode MCP request frame',
        error,
      ),
    onSuccess: frame =>
      M.value(frame.request).pipe(
        M.tag('RequestListRuntimes', () =>
          replyListRuntimes(state, client, frame.id),
        ),
        M.orElse(() => forwardRequestToBrowsers(server, frame)),
      ),
  })

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
      response: ResponseRuntimes({ runtimes }),
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
      S.encodeUnknownSync(RequestFrame)(frame),
    ),
  )

// EVENT DISPATCH

const dispatchEvent = (server: ViteDevServer, state: State, event: Event) =>
  M.value(event).pipe(
    M.tagsExhaustive({
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

const startMcpRelay = (port: number, enqueue: (event: Event) => void) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const wss = new WebSocketServer({ port })
      wss.on('error', error => {
        if ('code' in error && error.code === 'EADDRINUSE') {
          console.error(
            `\n[foldkit:devTools] Port ${port} is already in use, so the DevTools MCP relay could not start.\n` +
              `[foldkit:devTools] This usually means another Foldkit project is already running and bound to this port.\n` +
              `[foldkit:devTools] Until the port is freed, agents will not be able to connect to this app via the Foldkit DevTools MCP server.\n` +
              `[foldkit:devTools] Stop the other project, or set a different \`devToolsMcpPort\` in this project's vite config.\n`,
          )
        } else {
          console.error(
            `[foldkit:devTools] MCP relay failed to start on port ${port}; continuing without the relay`,
            error,
          )
        }
      })
      wss.on('connection', client => {
        enqueue(Event.McpClientConnected({ client }))
        client.on('message', raw =>
          enqueue(Event.McpRequestReceived({ client, raw: raw.toString() })),
        )
        client.on('close', () =>
          enqueue(Event.McpClientDisconnected({ client })),
        )
        client.on('error', error => {
          console.error('[foldkit:devTools] MCP client error', error)
        })
      })
      wss.on('listening', () => {
        console.log(
          `[foldkit:devTools] MCP relay listening on ws://localhost:${port}`,
        )
      })
      return wss
    }),
    wss =>
      Effect.sync(() => {
        wss.close()
        console.log('[foldkit:devTools] MCP relay stopped')
      }),
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

    if (options.devToolsMcpPort !== undefined) {
      yield* startMcpRelay(options.devToolsMcpPort, enqueue)
    }

    yield* Stream.fromQueue(events).pipe(
      Stream.runForEach(event => dispatchEvent(server, state, event)),
    )
  })

// PLUGIN ENTRY

export const foldkit = (options: FoldkitPluginOptions = {}): Plugin => {
  const events = Effect.runSync(Queue.unbounded<Event>())

  return {
    name: 'foldkit-hmr',
    apply: 'serve',
    config: () => ({
      optimizeDeps: {
        include: [...FORCE_INCLUDED_EFFECT_NAMESPACES],
      },
    }),
    configureServer: server => {
      const fiber = Effect.runFork(Effect.scoped(main(server, events, options)))
      server.httpServer?.on('close', () => {
        Effect.runFork(Fiber.interrupt(fiber))
      })
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
}
