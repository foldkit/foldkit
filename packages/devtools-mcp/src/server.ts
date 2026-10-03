#!/usr/bin/env node
import { Console, Effect, HashMap, Layer, Option } from 'effect'

import * as NodeChildProcessSpawner from '@effect/platform-node/NodeChildProcessSpawner'
import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem'
import * as NodePath from '@effect/platform-node/NodePath'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { runInit } from './install.js'
import { makeRelayClient } from './relayClient.js'
import {
  configuredRelayUrl,
  loadSettings,
  resolveRelayTargets,
} from './relayLocation.js'
import { makeRelayRegistryReader } from './relayRegistry.js'
import { buildTools } from './tools.js'

const main = Effect.gen(function* () {
  const settings = yield* loadSettings
  yield* Option.match(configuredRelayUrl(settings), {
    onNone: () =>
      Console.error(
        `[foldkit-devtools-mcp] looking for Foldkit dev servers under ${settings.projectRoot}`,
      ),
    onSome: url =>
      Console.error(
        `[foldkit-devtools-mcp] connecting to the DevTools MCP relay at ${url}`,
      ),
  })
  const registryReader = yield* makeRelayRegistryReader
  const relayClient = yield* makeRelayClient(
    resolveRelayTargets(settings, registryReader),
  )
  const tools = buildTools(relayClient)
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
        Effect.runPromiseWith(runtime)(
          tool.handle(request.params.arguments ?? {}),
        ),
    }),
  )

  const transport = new StdioServerTransport()
  yield* Effect.tryPromise({
    try: () => server.connect(transport),
    catch: error => error as Error,
  })

  yield* Console.error('[foldkit-devtools-mcp] MCP server ready on stdio')

  // NOTE: blocks until stdin closes (parent MCP host exited). The relay
  // sockets opened on demand keep the event loop alive, so without this wait
  // and the explicit exit below, the subprocess outlives its parent and
  // accumulates as a zombie across host restarts.
  yield* Effect.callback<void>(resume => {
    const onClose = () => resume(Effect.void)
    process.stdin.on('end', onClose)
    process.stdin.on('close', onClose)
    return Effect.sync(() => {
      process.stdin.off('end', onClose)
      process.stdin.off('close', onClose)
    })
  })
})

const subcommand = process.argv[2]

if (subcommand === 'init') {
  runInit()
} else {
  Effect.runPromise(
    main.pipe(
      Effect.provide(
        Layer.provideMerge(
          NodeChildProcessSpawner.layer,
          Layer.mergeAll(NodeFileSystem.layer, NodePath.layer),
        ),
      ),
    ),
  ).then(
    () => process.exit(0),
    error => {
      console.error('[foldkit-devtools-mcp] fatal error', error)
      process.exit(1)
    },
  )
}
