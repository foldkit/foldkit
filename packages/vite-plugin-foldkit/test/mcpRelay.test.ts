import { connect, createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'
import { WebSocket } from 'ws'

import { foldkit } from '../src/index.ts'

const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const TEST_TIMEOUT = 20_000
const POLL_TIMEOUT = 10_000
// The runtime gives up on its boot-time model request after 500ms, and the
// relay retries a contended bind for four seconds.
const HMR_RESPONSE_BUDGET = 500

const findFreePort = () =>
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

const isPortAccepting = (port: number) =>
  new Promise<boolean>(resolveAccepting => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.on('connect', () => {
      socket.destroy()
      resolveAccepting(true)
    })
    socket.on('error', () => {
      socket.destroy()
      resolveAccepting(false)
    })
  })

const startMiddlewareModeServer = async (devToolsMcpPort: number) => {
  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true },
    plugins: [foldkit({ devToolsMcpPort })],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  return server
}

const startStandaloneServer = async (
  devToolsMcpPort: number,
  serverPort: number,
) => {
  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { port: serverPort, strictPort: true, host: '127.0.0.1' },
    plugins: [foldkit({ devToolsMcpPort })],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return server
}

const waitUntilRelayListening = (port: number) =>
  expect.poll(() => isPortAccepting(port), { timeout: POLL_TIMEOUT }).toBe(true)

const connectClient = async (port: number) => {
  const client = new WebSocket(`ws://127.0.0.1:${port}`)
  onTestFinished(() => client.terminate())
  await new Promise<void>((resolveOpen, reject) => {
    client.on('open', () => resolveOpen())
    client.on('error', reject)
  })
  return client
}

// NOTE: Binds every interface, the way `ws` does. Holding only 127.0.0.1
// leaves the relay free to bind `::` and the contention never happens.
const holdPort = async (port: number) => {
  const squatter = createNetServer()
  onTestFinished(() => new Promise<void>(done => squatter.close(() => done())))
  await new Promise<void>((resolveListening, reject) => {
    squatter.on('error', reject)
    squatter.listen(port, () => resolveListening())
  })
}

const requestPreservedModel = async (port: number) => {
  const client = new WebSocket(`ws://127.0.0.1:${port}`, 'vite-hmr')
  onTestFinished(() => client.terminate())
  await new Promise<void>((resolveOpen, reject) => {
    client.on('open', () => resolveOpen())
    client.on('error', reject)
  })

  const restored = new Promise<void>(resolveRestored => {
    client.on('message', raw => {
      const message = JSON.parse(raw.toString())
      if (message.event === 'foldkit:restore-model') {
        resolveRestored()
      }
    })
  })

  client.send(
    JSON.stringify({
      type: 'custom',
      event: 'foldkit:request-model',
      data: { id: 'test-runtime' },
    }),
  )

  return restored
}

describe('DevTools MCP relay', () => {
  it(
    'releases its port when a middleware-mode dev server closes',
    async () => {
      const port = await findFreePort()
      const server = await startMiddlewareModeServer(port)
      await waitUntilRelayListening(port)

      await server.close()

      expect(await isPortAccepting(port)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'closes connected MCP clients when the dev server closes',
    async () => {
      const port = await findFreePort()
      const server = await startMiddlewareModeServer(port)
      await waitUntilRelayListening(port)
      const client = await connectClient(port)

      await server.close()

      await expect.poll(() => client.readyState === client.CLOSED).toBe(true)
      expect(await isPortAccepting(port)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'releases its port when a standalone dev server closes',
    async () => {
      const port = await findFreePort()
      const serverPort = await findFreePort()
      const server = await startStandaloneServer(port, serverPort)
      await waitUntilRelayListening(port)

      await server.close()

      expect(await isPortAccepting(port)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'hands the relay over to the replacement when a dev server restarts',
    async () => {
      const port = await findFreePort()
      const server = await startMiddlewareModeServer(port)
      await waitUntilRelayListening(port)

      await server.restart()

      await waitUntilRelayListening(port)
      const client = await connectClient(port)
      expect(client.readyState).toBe(client.OPEN)

      await server.close()

      expect(await isPortAccepting(port)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'serves HMR model requests while a contended bind is still retrying',
    async () => {
      const port = await findFreePort()
      const serverPort = await findFreePort()
      await holdPort(port)
      await startStandaloneServer(port, serverPort)

      await expect(
        Promise.race([
          requestPreservedModel(serverPort),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('HMR bridge did not answer in time')),
              HMR_RESPONSE_BUDGET,
            ),
          ),
        ]),
      ).resolves.toBeUndefined()
    },
    TEST_TIMEOUT,
  )

  it(
    'closes promptly while a contended bind is still retrying',
    async () => {
      const port = await findFreePort()
      await holdPort(port)
      const server = await startMiddlewareModeServer(port)

      const startedAt = Date.now()
      await server.close()

      expect(Date.now() - startedAt).toBeLessThan(HMR_RESPONSE_BUDGET)
    },
    TEST_TIMEOUT,
  )
})
