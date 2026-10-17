#!/usr/bin/env node
import { Cause, Console, Effect, HashMap, Layer, Logger, Option } from 'effect'

import * as NodeChildProcessSpawner from '@effect/platform-node/NodeChildProcessSpawner'
import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem'
import * as NodePath from '@effect/platform-node/NodePath'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
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
        `[foldkit-devtools-mcp] looking up Foldkit dev servers for ${settings.projectRoot} on each tool call`,
      ),
    onSome: url =>
      Console.error(
        `[foldkit-devtools-mcp] using the DevTools MCP relay at ${url}`,
      ),
  })
  const registryReader = yield* makeRelayRegistryReader
  const relayClient = yield* Effect.acquireRelease(
    makeRelayClient(resolveRelayTargets(settings, registryReader)),
    client => client.close,
  )
  const tools = buildTools(relayClient)
  const toolsByName = HashMap.fromIterable(
    tools.map(tool => [tool.name, tool] as const),
  )
  const runtime = yield* Effect.context<never>()

  const server = yield* Effect.acquireRelease(
    Effect.sync(
      () =>
        new Server(
          { name: '@foldkit/devtools-mcp', version: '0.1.0' },
          { capabilities: { tools: {} } },
        ),
    ),
    server => Effect.promise(() => server.close()),
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

  server.setRequestHandler(CallToolRequestSchema, (request, { signal }) =>
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
          { signal },
        ),
    }),
  )

  const transport = new StdioServerTransport()
  yield* Effect.tryPromise(() => server.connect(transport))

  yield* Console.error('[foldkit-devtools-mcp] MCP server ready on stdio')

  // NOTE: The host closing stdin ends the Scope so the relay sockets and MCP
  // transport are released before the subprocess exits.
  yield* Effect.callback<void>(resume => {
    if (process.stdin.readableEnded || process.stdin.destroyed) {
      resume(Effect.void)
      return
    }

    const detach = () => {
      process.stdin.off('end', onClose)
      process.stdin.off('close', onClose)
    }
    const onClose = () => {
      detach()
      resume(Effect.void)
    }
    process.stdin.on('end', onClose)
    process.stdin.on('close', onClose)
    return Effect.sync(detach)
  })
})

const subcommand = process.argv[2]

if (subcommand === 'init') {
  runInit()
} else {
  NodeRuntime.runMain(
    main.pipe(
      Effect.scoped,
      Effect.provide(
        Layer.provideMerge(
          NodeChildProcessSpawner.layer,
          Layer.mergeAll(NodeFileSystem.layer, NodePath.layer),
        ),
      ),
      Effect.provideService(Logger.LogToStderr, true),
      Effect.tapCause(cause =>
        Cause.hasInterruptsOnly(cause)
          ? Effect.void
          : Console.error(
              '[foldkit-devtools-mcp] fatal error',
              Cause.pretty(cause),
            ),
      ),
    ),
    { disableErrorReporting: true },
  )
}
