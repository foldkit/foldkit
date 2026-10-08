import { Array, Effect, Match, Option, pipe } from 'effect'
import { Request, type Response } from 'foldkit/devtools-protocol'
import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Plugin, type ViteDevServer, createServer } from 'vite'
import { beforeEach, expect, onTestFinished, vi } from 'vitest'
import { WebSocket } from 'ws'

import { foldkit } from '@foldkit/vite-plugin'

import { type RelayClient, makeRelayClient } from '../src/relayClient.ts'
import { resolveRelayTargets } from '../src/relayLocation.ts'
import {
  type RelayRegistryReader,
  makeRelayRegistryReader,
} from '../src/relayRegistry.ts'
import { boundPort } from './boundPort.ts'
import {
  RELAY_DIRECTORY_VARIABLE,
  RUNTIME_DIRECTORY_VARIABLE,
  makeUncheckedRegistryReader,
  runWithNode,
} from './relayRegistryFixtures.ts'

export const RELAY_PATH = '/__foldkit/devtools-mcp'
export const POLL_TIMEOUT = 10_000
const DECLINE_DELAY = 50
const RUNTIME_RESPONSE_DELAY = 2 * DECLINE_DELAY
const RELAY_ERROR_PREFIX = '[foldkit:devTools]'

// NOTE: Models a full-stack dev plugin, such as a Workers runtime, that treats
// every non-Vite WebSocket upgrade as an application request and destroys the
// socket once the application declines it.
export const catchAllUpgrades = (seenPaths: Array<string>): Plugin => ({
  name: 'catch-all-upgrades',
  configureServer(server) {
    server.httpServer?.on('upgrade', (request, socket) => {
      const isViteUpgrade = pipe(
        Option.fromNullishOr(request.headers['sec-websocket-protocol']),
        Option.exists(protocol => protocol.startsWith('vite')),
      )
      if (isViteUpgrade) {
        return
      }
      seenPaths.push(new URL(request.url ?? '/', 'http://dev').pathname)
      setTimeout(() => socket.destroy(), DECLINE_DELAY)
    })
  },
})

const serverPort = (server: ViteDevServer): number =>
  Option.getOrThrowWith(
    boundPort(server.httpServer?.address()),
    () => new Error('The dev server has no bound port'),
  )

const restoreVariable = (name: string, previousValue: string | undefined) => {
  if (previousValue === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = previousValue
  }
}

// NOTE: Vitest runs afterEach hooks before onTestFinished callbacks, so an
// afterEach cleanup would remove the directories and restore the variables
// while the dev servers a test closes in onTestFinished still use them.
// Registered first, this cleanup runs after every callback the test adds.
export const useWorkspace = () => {
  const workspace = { root: '', registry: '' }

  beforeEach(async ({ onTestFinished }) => {
    const previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    const previousRuntimeDirectory = process.env[RUNTIME_DIRECTORY_VARIABLE]
    workspace.root = await realpath(
      await mkdtemp(join(tmpdir(), 'foldkit-workspace-')),
    )
    workspace.registry = await mkdtemp(join(tmpdir(), 'foldkit-mcp-relay-'))
    process.env[RELAY_DIRECTORY_VARIABLE] = workspace.registry
    const printError = console.error
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (args.map(String).join(' ').includes(RELAY_ERROR_PREFIX)) {
        printError(...args)
      }
    })
    vi.spyOn(console, 'log').mockImplementation(() => {})

    onTestFinished(async () => {
      vi.restoreAllMocks()
      restoreVariable(RELAY_DIRECTORY_VARIABLE, previousRegistryDirectory)
      restoreVariable(RUNTIME_DIRECTORY_VARIABLE, previousRuntimeDirectory)
      await rm(workspace.registry, { recursive: true, force: true })
      await rm(workspace.root, { recursive: true, force: true })
    })
  })

  return workspace
}

export const silenceRelayErrors = () => {
  vi.mocked(console.error).mockImplementation(() => {})
}

// NOTE: With no relay published, the MCP server falls back to the fixed port
// 9988, where a developer may run a dev server of their own. Sessions here
// reach only discovered relays, so such a server cannot answer them.
const discoveredTargets = (
  projectRoot: string,
  registryReader: RelayRegistryReader,
) =>
  resolveRelayTargets(
    {
      maybeConfiguredPort: Option.none(),
      maybeConfiguredHost: Option.none(),
      projectRoot,
    },
    registryReader,
  ).pipe(
    Effect.map(
      Array.filter(({ maybeProjectRoot }) => Option.isSome(maybeProjectRoot)),
    ),
  )

const publishedRelayCount = (
  root: string,
  registryReader: RelayRegistryReader,
) =>
  runWithNode(discoveredTargets(root, registryReader)).then(
    targets =>
      targets.filter(({ maybeProjectRoot }) =>
        Option.contains(maybeProjectRoot, root),
      ).length,
  )

export const startApplication = async (
  root: string,
  plugins: ReadonlyArray<Plugin> = [],
): Promise<ViteDevServer> => {
  await mkdir(join(root, 'src'), { recursive: true })
  const registryReader = await Effect.runPromise(makeUncheckedRegistryReader)
  const relaysBefore = await publishedRelayCount(root, registryReader)
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [...plugins, foldkit()],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  await expect
    .poll(() => publishedRelayCount(root, registryReader), {
      timeout: POLL_TIMEOUT,
    })
    .toBe(relaysBefore + 1)
  return server
}

export const openBrowserRuntime = async (
  server: ViteDevServer,
  connectionId: string,
): Promise<void> => {
  const browser = new WebSocket(
    `ws://127.0.0.1:${serverPort(server)}`,
    'vite-hmr',
  )
  onTestFinished(() => browser.terminate())
  await new Promise<void>((resolveOpen, reject) => {
    browser.once('open', () => resolveOpen())
    browser.once('error', reject)
  })
  const sendCustom = (event: string, data: unknown) =>
    browser.send(JSON.stringify({ type: 'custom', event, data }))
  browser.on('message', raw => {
    const payload = JSON.parse(raw.toString())
    if (
      payload.type !== 'custom' ||
      payload.event !== 'foldkit:devTools:request' ||
      payload.data.maybeConnectionId !== connectionId
    ) {
      return
    }
    setTimeout(
      () =>
        sendCustom('foldkit:devTools:response', {
          id: payload.data.id,
          response: {
            _tag: 'ResponseReplayed',
            model: {
              connectionId,
              keyframeIndex: payload.data.request.keyframeIndex,
            },
          },
        }),
      RUNTIME_RESPONSE_DELAY,
    )
  })
  sendCustom('foldkit:devTools:event', {
    maybeConnectionId: connectionId,
    event: {
      _tag: 'EventConnected',
      runtime: { connectionId, url: 'http://app/', title: connectionId },
    },
  })
}

export const openSession = async (
  projectRoot: string,
): Promise<RelayClient> => {
  const client = await runWithNode(
    Effect.flatMap(makeRelayRegistryReader, registryReader =>
      makeRelayClient(discoveredTargets(projectRoot, registryReader)),
    ),
  )
  onTestFinished(() => Effect.runPromise(client.close))
  return client
}

export const listedIds = (client: RelayClient) =>
  Effect.runPromise(client.listRuntimes).then(listed =>
    listed.map(({ runtime }) => runtime.connectionId),
  )

export const replay = (
  client: RelayClient,
  connectionId: string,
  keyframeIndex: number,
) =>
  Effect.runPromise(
    client
      .sendRequest(
        Request.RequestReplayToKeyframe({ keyframeIndex }),
        connectionId,
      )
      .pipe(
        Effect.map((response: typeof Response.Type) =>
          Match.value(response).pipe(
            Match.tag('ResponseReplayed', ({ model }) => model),
            Match.orElse(({ _tag }) => _tag),
          ),
        ),
        Effect.catch(error => Effect.succeed(String(error))),
      ),
  )

export const loggedErrors = (): ReadonlyArray<string> =>
  vi.mocked(console.error).mock.calls.map(call => call.map(String).join(' '))

export const connectionCount = (): number =>
  loggedErrors().filter(line => line.includes('] connected to ')).length
