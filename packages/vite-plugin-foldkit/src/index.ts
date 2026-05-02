import {
  Array,
  Effect,
  Either,
  HashMap,
  HashSet,
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

const connectedRuntimesRef = Ref.unsafeMake<
  HashMap.HashMap<string, typeof RuntimeInfo.Type>
>(HashMap.empty())
const mcpClientsRef = Ref.unsafeMake<HashSet.HashSet<WebSocket>>(
  HashSet.empty(),
)
const clientConnectionsRef = Ref.unsafeMake<
  HashMap.HashMap<WebSocketClient, HashSet.HashSet<string>>
>(HashMap.empty())
const trackedClientsRef = Ref.unsafeMake<HashSet.HashSet<WebSocketClient>>(
  HashSet.empty(),
)

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
          `[foldkit:devTools] Stop the other project, or set a different \`devToolsMcpPort\` in this project's vite config.\n` +
          `[foldkit:devTools] If you change \`devToolsMcpPort\`, also set \`FOLDKIT_DEVTOOLS_MCP_PORT\` to the same value for your MCP server.\n`,
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
    Effect.runSync(Ref.update(mcpClientsRef, HashSet.add(client)))
    const total = HashSet.size(Effect.runSync(Ref.get(mcpClientsRef)))
    console.log(`[foldkit:devTools] MCP client connected (${total} total)`)
    client.on('message', raw => {
      handleMcpMessage(client, raw.toString())
    })
    client.on('close', () => {
      Effect.runSync(Ref.update(mcpClientsRef, HashSet.remove(client)))
      const remaining = HashSet.size(Effect.runSync(Ref.get(mcpClientsRef)))
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
  HashSet.forEach(clients, client => {
    client.close()
  })
  Effect.runSync(Ref.set(mcpClientsRef, HashSet.empty()))
  mcpWebSocketServer?.close()
  mcpWebSocketServer = null
  console.log('[foldkit:devTools] MCP relay stopped')
}

const handleBrowserEventFrame = (
  data: unknown,
  client: WebSocketClient,
): void => {
  const decoded = S.decodeUnknownEither(EventFrame)(data)
  Either.match(decoded, {
    onLeft: error => {
      console.warn(
        '[foldkit:devTools] failed to decode browser event frame',
        error,
      )
    },
    onRight: frame =>
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
  if (HashSet.has(tracked, client)) {
    return
  }
  Effect.runSync(Ref.update(trackedClientsRef, HashSet.add(client)))
  client.socket.on('close', () => handleClientClose(client))
}

const handleClientClose = (client: WebSocketClient): void => {
  pipe(
    Effect.runSync(Ref.get(clientConnectionsRef)),
    HashMap.get(client),
    Option.match({
      onNone: () => {},
      onSome: connectionIds =>
        HashSet.forEach(connectionIds, connectionId => {
          Effect.runSync(
            Ref.update(connectedRuntimesRef, HashMap.remove(connectionId)),
          )
          console.log(
            `[foldkit:devTools] runtime pruned (socket close): ${connectionId}`,
          )
        }),
    }),
  )
  Effect.runSync(Ref.update(clientConnectionsRef, HashMap.remove(client)))
  Effect.runSync(Ref.update(trackedClientsRef, HashSet.remove(client)))
}

const handleBrowserResponseFrame = (data: unknown): void => {
  const decoded = S.decodeUnknownEither(ResponseFrame)(data)
  Either.match(decoded, {
    onLeft: error => {
      console.warn(
        '[foldkit:devTools] failed to decode browser response frame',
        error,
      )
    },
    onRight: forwardResponseToMcpClients,
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
      const existing = pipe(
        HashMap.get(currentMap, client),
        Option.getOrElse(() => HashSet.empty<string>()),
      )
      return HashMap.set(
        currentMap,
        client,
        HashSet.add(existing, event.runtime.connectionId),
      )
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
  HashSet.forEach(clients, client => {
    if (client.readyState === client.OPEN) {
      client.send(payload)
    }
  })
}

const forwardResponseToMcpClients = (
  responseFrame: typeof ResponseFrame.Type,
): void => {
  broadcastToMcpClients(JSON.stringify(responseFrame))
}

const handleMcpMessage = (client: WebSocket, raw: string): void => {
  const decoded = S.decodeUnknownEither(S.parseJson(RequestFrame))(raw)
  Either.match(decoded, {
    onLeft: error => {
      console.warn(
        '[foldkit:devTools] failed to decode MCP request frame',
        error,
      )
    },
    onRight: frame =>
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

const forwardRequestToBrowsers = (frame: typeof RequestFrame.Type): void => {
  if (viteServer === null) {
    return
  }
  viteServer.ws.send('foldkit:devTools:request', frame)
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
