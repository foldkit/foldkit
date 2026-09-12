import { ConfigProvider, Effect, Option } from 'effect'
import { mkdtemp, rm } from 'node:fs/promises'
import { connect, createServer as createNetServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
} from 'vitest'
import { WebSocket } from 'ws'

import { NodeServices } from '@effect/platform-node'

import { type FoldkitPluginOptions, foldkit } from '../src/index.ts'
import { type RelayRecord, readRelayRecord } from '../src/relayRegistry.ts'

const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const TEST_TIMEOUT = 20_000
const POLL_TIMEOUT = 10_000
// The runtime gives up on its boot-time model request after 500ms, and the
// relay retries a contended bind for four seconds.
const MODEL_PRESERVATION_RESPONSE_BUDGET = 500

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
    'serves Model-preservation requests while a contended bind is still retrying',
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
              () =>
                reject(
                  new Error('Model-preservation bridge did not answer in time'),
                ),
              MODEL_PRESERVATION_RESPONSE_BUDGET,
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

      expect(Date.now() - startedAt).toBeLessThan(
        MODEL_PRESERVATION_RESPONSE_BUDGET,
      )
    },
    TEST_TIMEOUT,
  )
})

const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
const RELAY_PATH = '/__foldkit/devtools-mcp'
// Long enough for a relay that was going to bind to have bound and published.
const NO_RELAY_SETTLE = 300

const startMiddlewareServer = async (
  options: FoldkitPluginOptions,
  mode: string | undefined = undefined,
) => {
  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true },
    plugins: [foldkit(options)],
    ...(mode === undefined ? {} : { mode }),
  })
  onTestFinished(() => server.close().catch(() => undefined))
  return server
}

const startListeningServer = async (
  options: FoldkitPluginOptions,
  serverPort: number,
) => {
  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { port: serverPort, strictPort: true, host: '127.0.0.1' },
    plugins: [foldkit(options)],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return server
}

// A fresh environment provider per read: Effect's default one snapshots the
// environment on first use, before the test has pointed the registry at its
// own directory.
const publishedRecord = (root: string) =>
  Effect.runPromise(
    readRelayRecord(root).pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv(),
      ),
      Effect.provide(NodeServices.layer),
    ),
  ).then(Option.getOrUndefined)

const waitUntilPublished = async (root: string): Promise<RelayRecord> => {
  await expect
    .poll(() => publishedRecord(root), { timeout: POLL_TIMEOUT })
    .toBeDefined()
  const record = await publishedRecord(root)
  if (record === undefined) {
    throw new Error('relay record vanished')
  }
  return record
}

const connectClientAt = async (url: string) => {
  const client = new WebSocket(url)
  onTestFinished(() => client.terminate())
  await new Promise<void>((resolveOpen, reject) => {
    client.on('open', () => resolveOpen())
    client.on('error', reject)
  })
  return client
}

const settle = () =>
  new Promise<void>(done => setTimeout(done, NO_RELAY_SETTLE))

describe('DevTools MCP relay discovery', () => {
  let registryDirectory = ''
  let previousRegistryDirectory: string | undefined

  beforeEach(async () => {
    previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    registryDirectory = await mkdtemp(join(tmpdir(), 'foldkit-relay-test-'))
    process.env[RELAY_DIRECTORY_VARIABLE] = registryDirectory
  })

  afterEach(async () => {
    if (previousRegistryDirectory === undefined) {
      delete process.env[RELAY_DIRECTORY_VARIABLE]
    } else {
      process.env[RELAY_DIRECTORY_VARIABLE] = previousRegistryDirectory
    }
    await rm(registryDirectory, { recursive: true, force: true })
  })

  it(
    'serves the relay on the dev server itself and publishes its address',
    async () => {
      const serverPort = await findFreePort()
      const server = await startListeningServer({}, serverPort)
      const root = server.config.root

      const record = await waitUntilPublished(root)

      expect(record.pid).toBe(process.pid)
      expect(record.url).toBe(`ws://127.0.0.1:${serverPort}${RELAY_PATH}`)
      const client = await connectClientAt(record.url)
      expect(client.readyState).toBe(client.OPEN)

      await server.close()

      expect(await publishedRecord(root)).toBeUndefined()
      expect(await isPortAccepting(serverPort)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'leaves other upgrades on the dev server to Vite',
    async () => {
      const serverPort = await findFreePort()
      const server = await startListeningServer({}, serverPort)
      await waitUntilPublished(server.config.root)

      await expect(
        Promise.race([
          requestPreservedModel(serverPort),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('Model-preservation bridge did not answer in time'),
                ),
              MODEL_PRESERVATION_RESPONSE_BUDGET,
            ),
          ),
        ]),
      ).resolves.toBeUndefined()
    },
    TEST_TIMEOUT,
  )

  it(
    'falls back to a free loopback port in middleware mode',
    async () => {
      const server = await startMiddlewareServer({})
      const root = server.config.root

      const record = await waitUntilPublished(root)

      const url = new URL(record.url)
      expect(url.hostname).toBe('127.0.0.1')
      expect(Number(url.port)).toBeGreaterThan(0)
      await waitUntilRelayListening(Number(url.port))
      const client = await connectClientAt(record.url)
      expect(client.readyState).toBe(client.OPEN)

      await server.close()

      expect(await publishedRecord(root)).toBeUndefined()
      expect(await isPortAccepting(Number(url.port))).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps a configured port on a socket of its own and publishes it',
    async () => {
      const port = await findFreePort()
      const serverPort = await findFreePort()
      const server = await startListeningServer(
        { devToolsMcpPort: port },
        serverPort,
      )

      const record = await waitUntilPublished(server.config.root)

      expect(record.url).toBe(`ws://localhost:${port}`)
      await waitUntilRelayListening(port)
    },
    TEST_TIMEOUT,
  )

  it(
    'starts no relay when Vite runs in test mode',
    async () => {
      const server = await startMiddlewareServer({}, 'test')

      await settle()

      expect(await publishedRecord(server.config.root)).toBeUndefined()
    },
    TEST_TIMEOUT,
  )

  it(
    'starts no relay when the option is false',
    async () => {
      const server = await startMiddlewareServer({ devToolsMcpPort: false })

      await settle()

      expect(await publishedRecord(server.config.root)).toBeUndefined()
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps the replacement relay published across a dev server restart',
    async () => {
      const serverPort = await findFreePort()
      const server = await startListeningServer({}, serverPort)
      const root = server.config.root
      const before = await waitUntilPublished(root)

      await server.restart()

      await expect
        .poll(
          async () =>
            (await publishedRecord(root))?.startedAt !== before.startedAt,
          { timeout: POLL_TIMEOUT },
        )
        .toBe(true)
      const after = await waitUntilPublished(root)
      expect(after.url).toBe(before.url)
      const client = await connectClientAt(after.url)
      expect(client.readyState).toBe(client.OPEN)

      await server.close()

      expect(await publishedRecord(root)).toBeUndefined()
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps the replacement relay published across a middleware-mode restart',
    async () => {
      const server = await startMiddlewareServer({})
      const root = server.config.root
      const before = await waitUntilPublished(root)

      await server.restart()

      await expect
        .poll(async () => (await publishedRecord(root))?.url !== before.url, {
          timeout: POLL_TIMEOUT,
        })
        .toBe(true)
      const after = await waitUntilPublished(root)
      const client = await connectClientAt(after.url)
      expect(client.readyState).toBe(client.OPEN)
      expect(await isPortAccepting(Number(new URL(before.url).port))).toBe(
        false,
      )

      await server.close()

      expect(await publishedRecord(root)).toBeUndefined()
    },
    TEST_TIMEOUT,
  )
})
