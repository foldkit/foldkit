import {
  Array,
  Effect,
  Exit,
  HashMap,
  Match,
  Option,
  Ref,
  Schema as S,
  pipe,
} from 'effect'
import {
  type EventConnected,
  type EventDisconnected,
  EventFrame,
  RequestFrame,
  ResponseFrame,
  ResponseRuntimes,
  RuntimeInfo,
} from 'foldkit/devtools-protocol'
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

let preservedModel: unknown = undefined
let isHmrReload = false

const connectedRuntimesRef = Ref.makeUnsafe<
  HashMap.HashMap<string, typeof RuntimeInfo.Type>
>(HashMap.empty())

// NOTE: identity-keyed; do not switch to HashSet/HashMap. Structural Equal
// would recurse into live socket internals (slow, circular-ref risk).
const mcpClientsRef = Ref.makeUnsafe<Set<WebSocket>>(new Set())
const clientConnectionsRef = Ref.makeUnsafe<Map<WebSocketClient, Set<string>>>(
  new Map(),
)
const trackedClientsRef = Ref.makeUnsafe<Set<WebSocketClient>>(new Set())

let viteServer: ViteDevServer | null = null
let mcpWebSocketServer: WebSocketServer | null = null

export const foldkit = (options: FoldkitPluginOptions = {}): Plugin => {
  return {
    name: 'foldkit-hmr',
    apply: 'serve',
    configureServer: server => configureServer(server, options),
    handleHotUpdate,
  }
}

const configureServer = (
  server: ViteDevServer,
  options: FoldkitPluginOptions,
): void => {
  viteServer = server

  server.ws.on('foldkit:preserve-model', model => {
    preservedModel = model
  })

  server.ws.on('foldkit:request-model', () => {
    server.ws.send(
      'foldkit:restore-model',
      isHmrReload ? preservedModel : undefined,
    )
    if (!isHmrReload) {
      preservedModel = undefined
    }
    isHmrReload = false
  })

  server.ws.on(
    'foldkit:devTools:event',
    (data: unknown, client: WebSocketClient) => {
      ensureClientTracked(client)
      handleBrowserEventFrame(data, client)
    },
  )

  server.ws.on('foldkit:devTools:response', (data: unknown) => {
    handleBrowserResponseFrame(data)
  })

  if (options.devToolsMcpPort !== undefined) {
    startMcpWebSocketServer(options.devToolsMcpPort)
    server.httpServer?.on('close', stopMcpWebSocketServer)
  }
}

const startMcpWebSocketServer = (port: number): void => {
  const wss = new WebSocketServer({ port })
  mcpWebSocketServer = wss
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
    mcpWebSocketServer = null
  })
  wss.on('connection', client => {
    Effect.runSync(Ref.update(mcpClientsRef, set => set.add(client)))
    const total = Effect.runSync(Ref.get(mcpClientsRef)).size
    console.log(`[foldkit:devTools] MCP client connected (${total} total)`)
    client.on('message', raw => {
      handleMcpMessage(client, raw.toString())
    })
    client.on('close', () => {
      Effect.runSync(
        Ref.update(mcpClientsRef, set => {
          set.delete(client)
          return set
        }),
      )
      const remaining = Effect.runSync(Ref.get(mcpClientsRef)).size
      console.log(
        `[foldkit:devTools] MCP client disconnected (${remaining} remaining)`,
      )
    })
    client.on('error', error => {
      console.error('[foldkit:devTools] MCP client error', error)
    })
  })
  wss.on('listening', () => {
    console.log(
      `[foldkit:devTools] MCP relay listening on ws://localhost:${port}`,
    )
  })
}

const stopMcpWebSocketServer = (): void => {
  const clients = Effect.runSync(Ref.get(mcpClientsRef))
  for (const client of clients) {
    client.close()
  }
  Effect.runSync(Ref.set(mcpClientsRef, new Set()))
  mcpWebSocketServer?.close()
  mcpWebSocketServer = null
  console.log('[foldkit:devTools] MCP relay stopped')
}

const handleBrowserEventFrame = (
  data: unknown,
  client: WebSocketClient,
): void => {
  const decoded = S.decodeUnknownExit(EventFrame)(data)
  Exit.match(decoded, {
    onFailure: error => {
      console.warn(
        '[foldkit:devTools] failed to decode browser event frame',
        error,
      )
    },
    onSuccess: frame =>
      Match.value(frame.event).pipe(
        Match.tagsExhaustive({
          EventConnected: event => handleConnectedEvent(event, client),
          EventDisconnected: handleDisconnectedEvent,
        }),
      ),
  })
}

const ensureClientTracked = (client: WebSocketClient): void => {
  const tracked = Effect.runSync(Ref.get(trackedClientsRef))
  if (tracked.has(client)) {
    return
  }
  Effect.runSync(Ref.update(trackedClientsRef, set => set.add(client)))
  client.socket.on('close', () => handleClientClose(client))
}

const handleClientClose = (client: WebSocketClient): void => {
  const connections = Effect.runSync(Ref.get(clientConnectionsRef))
  Option.match(Option.fromNullishOr(connections.get(client)), {
    onNone: () => {},
    onSome: connectionIds => {
      for (const connectionId of connectionIds) {
        Effect.runSync(
          Ref.update(connectedRuntimesRef, HashMap.remove(connectionId)),
        )
        console.log(
          `[foldkit:devTools] runtime pruned (socket close): ${connectionId}`,
        )
      }
    },
  })
  Effect.runSync(
    Ref.update(clientConnectionsRef, map => {
      map.delete(client)
      return map
    }),
  )
  Effect.runSync(
    Ref.update(trackedClientsRef, set => {
      set.delete(client)
      return set
    }),
  )
}

const handleBrowserResponseFrame = (data: unknown): void => {
  const decoded = S.decodeUnknownExit(ResponseFrame)(data)
  Exit.match(decoded, {
    onFailure: error => {
      console.warn(
        '[foldkit:devTools] failed to decode browser response frame',
        error,
      )
    },
    onSuccess: forwardResponseToMcpClients,
  })
}

const handleConnectedEvent = (
  event: typeof EventConnected.Type,
  client: WebSocketClient,
): void => {
  Effect.runSync(
    Ref.update(
      connectedRuntimesRef,
      HashMap.set(event.runtime.connectionId, event.runtime),
    ),
  )
  Effect.runSync(
    Ref.update(clientConnectionsRef, currentMap => {
      const existing = Option.match(
        Option.fromNullishOr(currentMap.get(client)),
        {
          onNone: () => new Set<string>(),
          onSome: set => set,
        },
      )
      existing.add(event.runtime.connectionId)
      return currentMap.set(client, existing)
    }),
  )
  console.log(
    `[foldkit:devTools] runtime connected: ${event.runtime.connectionId} (${event.runtime.title})`,
  )
}

const handleDisconnectedEvent = (
  event: typeof EventDisconnected.Type,
): void => {
  Effect.runSync(
    Ref.update(connectedRuntimesRef, HashMap.remove(event.connectionId)),
  )
  console.log(`[foldkit:devTools] runtime disconnected: ${event.connectionId}`)
}

const broadcastToMcpClients = (payload: string): void => {
  const clients = Effect.runSync(Ref.get(mcpClientsRef))
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload)
    }
  }
}

const encodeResponseFrameToJson = S.encodeUnknownSync(
  S.fromJsonString(ResponseFrame),
)

const forwardResponseToMcpClients = (
  responseFrame: typeof ResponseFrame.Type,
): void => {
  broadcastToMcpClients(encodeResponseFrameToJson(responseFrame))
}

const handleMcpMessage = (client: WebSocket, raw: string): void => {
  const decoded = S.decodeUnknownExit(S.fromJsonString(RequestFrame))(raw)
  Exit.match(decoded, {
    onFailure: error => {
      console.warn(
        '[foldkit:devTools] failed to decode MCP request frame',
        error,
      )
    },
    onSuccess: frame =>
      Match.value(frame.request).pipe(
        Match.tag('RequestListRuntimes', () =>
          replyListRuntimes(client, frame.id),
        ),
        Match.orElse(() => forwardRequestToBrowsers(frame)),
      ),
  })
}

const replyListRuntimes = (client: WebSocket, requestId: string): void => {
  const runtimes = pipe(
    Effect.runSync(Ref.get(connectedRuntimesRef)),
    HashMap.values,
    Array.fromIterable,
  )
  const responseFrame = {
    id: requestId,
    response: ResponseRuntimes({ runtimes }),
  }
  if (client.readyState === client.OPEN) {
    client.send(JSON.stringify(responseFrame))
  }
}

const encodeRequestFrame = S.encodeUnknownSync(RequestFrame)

const forwardRequestToBrowsers = (frame: typeof RequestFrame.Type): void => {
  if (viteServer === null) {
    return
  }
  viteServer.ws.send('foldkit:devTools:request', encodeRequestFrame(frame))
}

const handleHotUpdate = ({
  server,
  modules,
}: {
  server: ViteDevServer
  modules: ReadonlyArray<unknown>
}) => {
  if (modules.length === 0) {
    return
  }

  isHmrReload = true
  server.ws.send({ type: 'full-reload' })
  return []
}
