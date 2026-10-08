import { Option, pipe } from 'effect'
import { createServer as createHttpServer } from 'node:http'
import { type Plugin, createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'
import { WebSocket } from 'ws'

import { foldkit } from '../src/index.ts'
import { boundPort } from './boundPort.ts'
import {
  RELAY_PATH,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const DECLINE_DELAY = 50
const OBSERVATION_WINDOW = 500
const TEST_TIMEOUT = 20_000

const directories = useRelayRegistry()

// NOTE: Models a full-stack dev plugin, such as a Workers runtime, that treats
// every non-Vite WebSocket upgrade as an application request and destroys the
// socket once the application declines it.
const catchAllUpgrades = (seenPaths: Array<string>): Plugin => ({
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

const startDecliningBackend = async (): Promise<number> => {
  const backend = createHttpServer((_request, response) => {
    response.writeHead(404).end()
  })
  onTestFinished(() => new Promise<void>(done => backend.close(() => done())))
  await new Promise<void>(resolveListening =>
    backend.listen(0, '127.0.0.1', () => resolveListening()),
  )
  return Option.getOrThrowWith(
    boundPort(backend.address()),
    () => new Error('backend has no port'),
  )
}

const openRelayClient = async (): Promise<WebSocket> => {
  const record = await waitUntilPublished(directories.root)
  const client = new WebSocket(record.url)
  onTestFinished(() => client.terminate())
  client.on('error', () => undefined)
  await new Promise<void>((resolveOpen, reject) => {
    client.once('open', () => resolveOpen())
    client.once('close', () => reject(new Error('closed before open')))
  })
  return client
}

it(
  'keeps an MCP relay connection open beside a plugin that handles every other upgrade',
  async () => {
    const seenPaths: Array<string> = []
    const server = await createServer({
      root: directories.root,
      configFile: false,
      logLevel: 'silent',
      server: { port: 0, host: '127.0.0.1' },
      plugins: [catchAllUpgrades(seenPaths), foldkit()],
    })
    onTestFinished(() => server.close().catch(() => undefined))
    await server.listen()

    const client = await openRelayClient()

    await new Promise(done => setTimeout(done, OBSERVATION_WINDOW))

    expect(seenPaths).not.toContain(RELAY_PATH)
    expect(client.readyState).toBe(WebSocket.OPEN)
  },
  TEST_TIMEOUT,
)

it(
  'keeps an MCP relay connection open beside a catch-all WebSocket proxy',
  async () => {
    const backendPort = await startDecliningBackend()
    const server = await createServer({
      root: directories.root,
      configFile: false,
      logLevel: 'silent',
      server: {
        port: 0,
        host: '127.0.0.1',
        proxy: {
          '^/(?!@vite|@fs|@id|src|node_modules).*': {
            target: `http://127.0.0.1:${backendPort}`,
            ws: true,
          },
        },
      },
      plugins: [foldkit()],
    })
    onTestFinished(() => server.close().catch(() => undefined))
    await server.listen()

    const client = await openRelayClient()

    await new Promise(done => setTimeout(done, OBSERVATION_WINDOW))

    expect(client.readyState).toBe(WebSocket.OPEN)
  },
  TEST_TIMEOUT,
)
