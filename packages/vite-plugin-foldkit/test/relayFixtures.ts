import { Array, ConfigProvider, Effect, Option, Predicate } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { Server, createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ViteDevServer } from 'vite'
import { beforeEach, expect, onTestFinished, vi } from 'vitest'
import { WebSocket } from 'ws'

import * as NodeServices from '@effect/platform-node/NodeServices'

import { readRelayRecords } from '../src/relayRegistry.ts'
import { boundPort } from './boundPort.ts'

export const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
export const RELAY_PATH = '/__foldkit/devtools-mcp'
export const POLL_TIMEOUT = 10_000

const CONFIGURED_RELAY_PORT_ATTEMPTS = 3

export const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createNetServer()
    probe.on('error', error => {
      probe.close()
      reject(error)
    })
    probe.listen(0, '127.0.0.1', () => {
      const maybePort = boundPort(probe.address())
      if (Option.isSome(maybePort)) {
        probe.close(() => resolvePort(maybePort.value))
      } else {
        probe.close()
        reject(new Error('Could not determine a free port'))
      }
    })
  })

export const serverPort = (server: ViteDevServer): number =>
  Option.getOrThrowWith(
    boundPort(server.httpServer?.address()),
    () => new Error('The dev server has no bound port'),
  )

const listenCalls = () => vi.mocked(Server.prototype.listen).mock

export const findListener = (port: number): Option.Option<Server> =>
  Array.findFirst(
    listenCalls().contexts,
    (context): context is Server =>
      context instanceof Server &&
      context.listening &&
      Option.contains(boundPort(context.address()), port),
  )

export const listenerOn = (port: number): Server =>
  Option.getOrThrowWith(
    findListener(port),
    () => new Error(`No server in this process listens on port ${port}`),
  )

export const isListenAttemptedOn = (port: number): boolean =>
  listenCalls().calls.some(
    ([target]) =>
      target === port ||
      (Predicate.hasProperty(target, 'port') && target.port === port),
  )

const RELAY_ERROR_PREFIX = '[foldkit:devTools]'

// NOTE: Vitest runs afterEach hooks before onTestFinished callbacks, so an
// afterEach cleanup would remove the directories and restore the variable
// while the dev servers a test closes in onTestFinished still use them.
// Registered first, this cleanup runs after every callback the test adds.
export const useRelayRegistry = () => {
  const directories = { registry: '', root: '' }

  beforeEach(async ({ onTestFinished }) => {
    const previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    directories.registry = await mkdtemp(join(tmpdir(), 'foldkit-registry-'))
    directories.root = await realpath(
      await mkdtemp(join(tmpdir(), 'foldkit-app-')),
    )
    process.env[RELAY_DIRECTORY_VARIABLE] = directories.registry
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const printError = console.error
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (args.map(String).join(' ').includes(RELAY_ERROR_PREFIX)) {
        printError(...args)
      }
    })
    vi.spyOn(Server.prototype, 'listen')

    onTestFinished(async () => {
      vi.restoreAllMocks()
      if (previousRegistryDirectory === undefined) {
        delete process.env[RELAY_DIRECTORY_VARIABLE]
      } else {
        process.env[RELAY_DIRECTORY_VARIABLE] = previousRegistryDirectory
      }
      await rm(directories.registry, { recursive: true, force: true })
      await rm(directories.root, { recursive: true, force: true })
    })
  })

  return directories
}

export const silenceRelayErrors = () => {
  vi.mocked(console.error).mockImplementation(() => {})
}

export const publishedRecords = (
  root: string,
): Promise<ReadonlyArray<RelayRecord>> =>
  Effect.runPromise(
    readRelayRecords.pipe(
      Effect.map(Array.filter(record => record.root === root)),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv(),
      ),
      Effect.provide(NodeServices.layer),
    ),
  )

const recordsPublishedInThisProcess = async (
  root: string,
): Promise<ReadonlyArray<RelayRecord>> =>
  Array.filter(
    await publishedRecords(root),
    record => record.pid === process.pid,
  )

export const waitUntilPublished = async (
  root: string,
): Promise<RelayRecord> => {
  await expect
    .poll(async () => (await recordsPublishedInThisProcess(root)).length, {
      timeout: POLL_TIMEOUT,
    })
    .toBe(1)
  return Option.getOrThrowWith(
    Array.head(await recordsPublishedInThisProcess(root)),
    () => new Error('relay record vanished'),
  )
}

export const openWebSocket = async (url: string, protocol?: string) => {
  const client = new WebSocket(url, protocol)
  onTestFinished(() => client.terminate())
  await new Promise<void>((resolveOpen, reject) => {
    client.once('open', () => resolveOpen())
    client.once('error', reject)
  })
  return client
}

export const loggedLines = (
  method: typeof console.log,
): ReadonlyArray<string> =>
  vi.mocked(method).mock.calls.map(call => call.map(String).join(' '))

const isRelayListeningOn = (relayPort: number) =>
  loggedLines(console.log).some(line =>
    line.includes(`MCP relay listening at ws://localhost:${relayPort}/`),
  )

const isRelayPortInUse = (relayPort: number) =>
  loggedLines(console.error).some(line =>
    line.includes(`Port ${relayPort} is in use`),
  )

// NOTE: A configured relay port is chosen before the plugin binds it, so a
// suite running at the same time can take it in between. The plugin retries a
// contended bind and then reports the port in use, and this starts the server
// again on another port. It reads the relay's console lines, so the test must
// use useRelayRegistry.
export const startOnConfiguredRelayPort = async (
  start: (relayPort: number) => Promise<ViteDevServer>,
  attemptsLeft = CONFIGURED_RELAY_PORT_ATTEMPTS,
): Promise<Readonly<{ server: ViteDevServer; relayPort: number }>> => {
  const relayPort = await findFreePort()
  const server = await start(relayPort)
  await expect
    .poll(() => isRelayListeningOn(relayPort) || isRelayPortInUse(relayPort), {
      timeout: POLL_TIMEOUT,
    })
    .toBe(true)

  if (isRelayListeningOn(relayPort)) {
    return { server, relayPort }
  } else if (attemptsLeft > 1) {
    await server.close()
    return startOnConfiguredRelayPort(start, attemptsLeft - 1)
  } else {
    throw new Error(
      `Every configured relay port was taken in ${CONFIGURED_RELAY_PORT_ATTEMPTS} attempts`,
    )
  }
}
