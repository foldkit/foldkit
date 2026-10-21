import { Array, Option } from 'effect'
import type { Server as HttpServer } from 'node:http'
import { Server, createConnection } from 'node:net'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { expect, it, onTestFinished, vi } from 'vitest'

import { type FoldkitPluginOptions, foldkit } from '../src/index.ts'
import { boundPort } from './boundPort.ts'
import {
  POLL_TIMEOUT,
  holdFreePort,
  isListenAttemptedOn,
} from './relayFixtures.ts'

const httpServers = vi.hoisted(() => new globalThis.Array<HttpServer>())

vi.mock('node:http', async importOriginal => {
  const nodeHttp = await importOriginal<typeof import('node:http')>()
  const createHttpServer = (
    ...args: Parameters<typeof nodeHttp.createServer>
  ) => {
    const server = nodeHttp.createServer(...args)
    httpServers.push(server)

    return server
  }

  return { ...nodeHttp, createServer: vi.fn(createHttpServer) }
})

const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const RELAY_LOG_PREFIX = '[foldkit:devTools] MCP relay listening at '
const RELAY_DEFECT_MESSAGE =
  '[foldkit:devTools] MCP relay failed with an unexpected error'

const closeHttpServer = (server: HttpServer): Promise<void> => {
  if (!server.listening) {
    return Promise.resolve()
  }

  return new Promise(resolveClosed => server.close(() => resolveClosed()))
}

const canConnect = (port: number): Promise<boolean> =>
  new Promise(resolveConnected => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolveConnected(true)
    })
    socket.once('error', () => resolveConnected(false))
  })

const startDevServer = async (options: FoldkitPluginOptions = {}) => {
  httpServers.splice(0)
  onTestFinished(async () => {
    vi.restoreAllMocks()
    await Promise.all(Array.map(httpServers, closeHttpServer))
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})

  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true },
    plugins: [foldkit(options)],
  })
  onTestFinished(() => server.close().catch(() => undefined))

  return server
}

const relayDefectCalls = () =>
  Array.filter(
    vi.mocked(console.error).mock.calls,
    ([message]) => message === RELAY_DEFECT_MESSAGE,
  )

it('closes a relay acquired before startup logging fails', async () => {
  let maybeRelayUrl = Option.none<string>()
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    const line = args.map(String).join(' ')
    if (line.startsWith(RELAY_LOG_PREFIX)) {
      maybeRelayUrl = Option.some(line.slice(RELAY_LOG_PREFIX.length))
      throw new Error('stdout is closed')
    }
  })

  const server = await startDevServer()

  await expect
    .poll(() => Option.isSome(maybeRelayUrl), { timeout: POLL_TIMEOUT })
    .toBe(true)

  const relayPort = Number(new URL(Option.getOrThrow(maybeRelayUrl)).port)
  const relayServer = Option.getOrThrowWith(
    Array.findFirst(
      httpServers,
      candidate =>
        candidate.listening &&
        Option.contains(boundPort(candidate.address()), relayPort),
    ),
    () => new Error(`No captured HTTP server listens on port ${relayPort}`),
  )

  await server.close()

  expect(relayServer.listening).toBe(false)
  expect(await canConnect(relayPort)).toBe(false)
})

it('reports a relay defect on stderr', async () => {
  const stdoutClosed = new Error('stdout is closed')
  vi.spyOn(console, 'log').mockImplementation((...args) => {
    const line = args.map(String).join(' ')
    if (line.startsWith(RELAY_LOG_PREFIX)) {
      throw stdoutClosed
    }
  })

  await startDevServer()

  await expect
    .poll(
      () =>
        Array.some(relayDefectCalls(), ([, defect]) => defect === stdoutClosed),
      { timeout: POLL_TIMEOUT },
    )
    .toBe(true)
})

it('reports no relay defect when closing interrupts a retrying bind', async () => {
  const port = await holdFreePort()
  vi.spyOn(Server.prototype, 'listen')

  const server = await startDevServer({ devToolsMcpPort: port })

  await expect
    .poll(() => isListenAttemptedOn(port), { timeout: POLL_TIMEOUT })
    .toBe(true)

  await server.close()

  expect(relayDefectCalls()).toStrictEqual([])
})
