import { Array, ConfigProvider, Effect, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { connect, createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ViteDevServer } from 'vite'
import { beforeEach, expect, onTestFinished, vi } from 'vitest'
import { WebSocket } from 'ws'

import * as NodeServices from '@effect/platform-node/NodeServices'

import { readRelayRecords } from '../src/relayRegistry.ts'

export const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
export const RELAY_PATH = '/__foldkit/devtools-mcp'
export const POLL_TIMEOUT = 10_000

export const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createNetServer()
    probe.on('error', error => {
      probe.close()
      reject(error)
    })
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      if (address === null || typeof address === 'string') {
        probe.close()
        reject(new Error('Could not determine a free port'))
        return
      }
      const { port } = address
      probe.close(() => resolvePort(port))
    })
  })

export const isPortAccepting = (port: number) =>
  new Promise<boolean>(resolveAccepting => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.once('connect', () => {
      socket.destroy()
      resolveAccepting(true)
    })
    socket.once('error', () => {
      socket.destroy()
      resolveAccepting(false)
    })
  })

export const serverPort = (server: ViteDevServer): number => {
  const address = server.httpServer?.address()
  if (
    address === null ||
    address === undefined ||
    typeof address === 'string'
  ) {
    throw new Error('The dev server has no bound port')
  }
  return address.port
}

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
