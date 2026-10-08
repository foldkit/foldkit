import { connect } from 'node:net'
import { createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'
import { WebSocket } from 'ws'

import { type FoldkitPluginOptions, foldkit } from '../src/index.ts'
import {
  RELAY_PATH,
  openWebSocket,
  serverPort,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const TEST_TIMEOUT = 20_000

const directories = useRelayRegistry()

const startServer = async (options: FoldkitPluginOptions = {}) => {
  const server = await createServer({
    root: directories.root,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [foldkit(options)],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return server
}

const publishedRelayUrl = async () =>
  new URL((await waitUntilPublished(directories.root)).url)

const rawExchange = (port: number, request: string) =>
  new Promise<string>((resolveResponse, reject) => {
    const socket = connect({ port, host: '127.0.0.1' })
    const chunks: Array<string> = []
    socket.on('data', chunk => chunks.push(chunk.toString()))
    socket.on('close', () => resolveResponse(chunks.join('')))
    socket.on('error', reject)
    socket.on('connect', () => socket.write(request))
  })

const RESETTING_CLIENTS_PER_TARGET = 100
const REFUSED_TARGETS = ['/elsewhere', 'http://[', RELAY_PATH]

const sendUpgradeAndReset = (port: number, request: string) =>
  new Promise<void>(resolveClosed => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.on('error', () => undefined)
    socket.on('close', () => resolveClosed())
    socket.on('connect', () => {
      socket.write(request, () => socket.resetAndDestroy())
    })
  })

const upgradeRequest = (target: string) =>
  [
    `GET ${target} HTTP/1.1`,
    'Host: 127.0.0.1',
    'Connection: Upgrade',
    'Upgrade: websocket',
    'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version: 13',
    '',
    '',
  ].join('\r\n')

it(
  'attaches no upgrade listener to the dev server',
  async () => {
    const withoutRelay = await startServer({ devToolsMcpPort: false })
    const listenerCountWithoutRelay =
      withoutRelay.httpServer?.listenerCount('upgrade')
    await withoutRelay.close()

    const withRelay = await startServer()
    await publishedRelayUrl()

    expect(withRelay.httpServer?.listenerCount('upgrade')).toBe(
      listenerCountWithoutRelay,
    )
  },
  TEST_TIMEOUT,
)

it(
  'answers a plain HTTP request with 426',
  async () => {
    await startServer()
    const url = await publishedRelayUrl()

    const response = await fetch(`http://127.0.0.1:${url.port}/`)

    expect(response.status).toBe(426)
    expect(response.headers.get('upgrade')).toBe('websocket')
    expect(await response.text()).toBe('Upgrade Required')
  },
  TEST_TIMEOUT,
)

it(
  'refuses an upgrade for another path, an unparseable target, or a missing token',
  async () => {
    await startServer()
    const url = await publishedRelayUrl()
    const port = Number(url.port)

    expect(await rawExchange(port, upgradeRequest('/elsewhere'))).toMatch(
      /^HTTP\/1\.1 404 Not Found\r\n/,
    )
    expect(await rawExchange(port, upgradeRequest('http://['))).toMatch(
      /^HTTP\/1\.1 400 Bad Request\r\n/,
    )
    expect(await rawExchange(port, upgradeRequest(RELAY_PATH))).toMatch(
      /^HTTP\/1\.1 401 Unauthorized\r\n/,
    )

    const client = await openWebSocket(url.toString())
    expect(client.readyState).toBe(WebSocket.OPEN)
  },
  TEST_TIMEOUT,
)

it(
  'keeps serving after clients reset refused upgrades',
  async () => {
    const uncaughtErrors: Array<Error> = []
    const collectUncaughtError = (error: Error) => {
      uncaughtErrors.push(error)
    }
    process.on('uncaughtException', collectUncaughtError)
    onTestFinished(() => {
      process.off('uncaughtException', collectUncaughtError)
    })

    const server = await startServer()
    const url = await publishedRelayUrl()
    const port = Number(url.port)

    await Promise.all(
      REFUSED_TARGETS.flatMap(target =>
        Array.from({ length: RESETTING_CLIENTS_PER_TARGET }, () =>
          sendUpgradeAndReset(port, upgradeRequest(target)),
        ),
      ),
    )

    const client = await openWebSocket(url.toString())
    expect(client.readyState).toBe(WebSocket.OPEN)

    const response = await fetch(
      `http://127.0.0.1:${serverPort(server)}/@vite/client`,
    )
    expect(response.status).toBe(200)
    await response.arrayBuffer()

    expect(uncaughtErrors).toEqual([])
  },
  TEST_TIMEOUT,
)
