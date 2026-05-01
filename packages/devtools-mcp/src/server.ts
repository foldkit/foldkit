#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { Effect, HashMap, Option, Runtime } from 'effect'

import { runInit } from './install.js'
import { buildTools } from './tools.js'
import { connectWebSocketClient } from './webSocketClient.js'

const DEFAULT_PORT = 9988
const DEFAULT_HOST = 'localhost'

const port = Number(process.env['FOLDKIT_DEVTOOLS_MCP_PORT'] ?? DEFAULT_PORT)
const host = process.env['FOLDKIT_DEVTOOLS_MCP_HOST'] ?? DEFAULT_HOST

const main: Effect.Effect<void, Error> = Effect.gen(function* () {
  const wsClient = yield* connectWebSocketClient(`ws://${host}:${port}`)
  const tools = buildTools(wsClient)
  const toolsByName = HashMap.fromIterable(
    tools.map(tool => [tool.name, tool] as const),
  )
  const runtime = yield* Effect.context<never>()

  const server = new Server(
    { name: '@foldkit/devtools-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, () =>
    Promise.resolve({
      tools: tools.map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      })),
    }),
  )

  server.setRequestHandler(CallToolRequestSchema, request =>
    Option.match(HashMap.get(toolsByName, request.params.name), {
      onNone: () =>
        Promise.resolve({
          content: [
            {
              type: 'text',
              text: `Error: unknown tool ${request.params.name}`,
            },
          ],
          isError: true,
        }),
      onSome: tool =>
        Runtime.runPromise(runtime)(
          tool.handle(request.params.arguments ?? {}),
        ),
    }),
  )

  const transport = new StdioServerTransport()
  yield* Effect.tryPromise({
    try: () => server.connect(transport),
    catch: error => error as Error,
  })

  yield* Effect.sync(() =>
    console.error('[foldkit-devtools-mcp] MCP server ready on stdio'),
  )
})

const subcommand = process.argv[2]

if (subcommand === 'init') {
  runInit()
} else {
  Effect.runPromise(main).catch(error => {
    console.error('[foldkit-devtools-mcp] fatal error', error)
    process.exit(1)
  })
}
