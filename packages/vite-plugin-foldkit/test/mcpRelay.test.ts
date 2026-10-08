import {
  Array,
  ConfigProvider,
  Effect,
  FileSystem,
  Option,
  Order,
  Predicate,
  Schema,
} from 'effect'
import { RelayRecord } from 'foldkit/devtools-protocol'
import { chmod, readFile, readdir, writeFile } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
import { networkInterfaces } from 'node:os'
import { join, resolve } from 'node:path'
import {
  type HmrContext,
  type MinimalPluginContextWithoutEnvironment,
  type Plugin,
  type ViteDevServer,
  createServer,
} from 'vite'
import { describe, expect, it, onTestFinished } from 'vitest'
import { WebSocket } from 'ws'

import * as NodeServices from '@effect/platform-node/NodeServices'
import basicSsl from '@vitejs/plugin-basic-ssl'

import { type FoldkitPluginOptions, foldkit } from '../src/index.ts'
import {
  type RelayPublisherServices,
  publishRelayRecord,
  retireRelayRecord,
} from '../src/relayRegistry.ts'
import {
  makeRelayRegistryTrust,
  relayRegistryDirectoryRefusal,
} from '../src/relayRegistryTrust.ts'
import { boundPort } from './boundPort.ts'
import {
  POLL_TIMEOUT,
  RELAY_DIRECTORY_VARIABLE,
  RELAY_PATH,
  findListener,
  listenerOn,
  loggedLines,
  openWebSocket,
  publishedRecords,
  serverPort,
  silenceRelayErrors,
  startOnConfiguredRelayPort,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const TEST_TIMEOUT = 20_000
const MODEL_PRESERVATION_RESPONSE_BUDGET = 500

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

const startStandaloneServer = async (devToolsMcpPort: number) => {
  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [foldkit({ devToolsMcpPort })],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return server
}

const waitUntilRelayListening = (port: number) =>
  expect
    .poll(() => Option.isSome(findListener(port)), { timeout: POLL_TIMEOUT })
    .toBe(true)

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
const holdFreePort = async (): Promise<number> => {
  const squatter = createNetServer()
  onTestFinished(() => new Promise<void>(done => squatter.close(() => done())))
  await new Promise<void>((resolveListening, reject) => {
    squatter.on('error', reject)
    squatter.listen(0, () => resolveListening())
  })
  return Option.getOrThrowWith(
    boundPort(squatter.address()),
    () => new Error('The squatter has no bound port'),
  )
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

const openHmrClient = async (port: number) => {
  const client = new WebSocket(`ws://127.0.0.1:${port}`, 'vite-hmr')
  onTestFinished(() => client.terminate())
  await new Promise<void>((resolveOpen, reject) => {
    client.on('open', () => resolveOpen())
    client.on('error', reject)
  })
  return client
}

const sendCustom = (client: WebSocket, event: string, data: unknown) => {
  client.send(JSON.stringify({ type: 'custom', event, data }))
}

const pluginContext: MinimalPluginContextWithoutEnvironment = {
  meta: {
    rollupVersion: '',
    rolldownVersion: '',
    watchMode: true,
    viteVersion: '',
  },
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: message => {
    throw new Error(String(message))
  },
}

const requestModel = (client: WebSocket, id: string) => {
  const restored = new Promise<unknown>(resolveRestored => {
    const onMessage = (raw: Buffer | ArrayBuffer | Array<Buffer>) => {
      const message = JSON.parse(raw.toString())
      if (message.event === 'foldkit:restore-model' && message.data.id === id) {
        client.off('message', onMessage)
        resolveRestored(message.data.model)
      }
    }
    client.on('message', onMessage)
  })
  sendCustom(client, 'foldkit:request-model', { id })
  return restored
}

const NO_RELAY_SETTLE = 300

const startMiddlewareServer = async (options: FoldkitPluginOptions) => {
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

const startListeningServer = async (
  options: FoldkitPluginOptions,
  plugins: ReadonlyArray<Plugin> = [],
  host = '127.0.0.1',
) => {
  const server = await createServer({
    root: PACKAGE_ROOT,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host },
    plugins: [...plugins, foldkit(options)],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  return server
}

const runRegistry = <A, E>(
  effect: Effect.Effect<A, E, RelayPublisherServices>,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv(),
      ),
      Effect.provide(NodeServices.layer),
    ),
  )

const publish = (record: RelayRecord) =>
  Effect.flatMap(makeRelayRegistryTrust, trust =>
    publishRelayRecord(record, trust),
  )

const decodeRelayRecordJson = Schema.decodeUnknownSync(
  Schema.fromJsonString(RelayRecord),
)

// NOTE: This exceeds every PID Linux or macOS can issue, so no live process can
// carry it.
const DEAD_PID = 2_147_483_647

const connectionRefused = (url: string) =>
  new Promise<boolean>(resolveRefused => {
    const client = new WebSocket(url)
    onTestFinished(() => client.terminate())
    client.on('open', () => resolveRefused(false))
    client.on('error', () => resolveRefused(true))
  })

const RELAY_TOKEN_PATTERN = /^[0-9a-f]{64}$/

const settle = () =>
  new Promise<void>(done => setTimeout(done, NO_RELAY_SETTLE))

const expectOwnLoopbackRelay = async (
  record: RelayRecord,
  maybeDevServerPort: Option.Option<number>,
) => {
  const url = new URL(record.url)
  expect(url.protocol).toBe('ws:')
  expect(url.hostname).toBe('127.0.0.1')
  expect(Number(url.port)).toBeGreaterThan(0)
  if (Option.isSome(maybeDevServerPort)) {
    expect(Number(url.port)).not.toBe(maybeDevServerPort.value)
  }
  expect(url.pathname).toBe(RELAY_PATH)
  expect(url.searchParams.get('token')).toMatch(RELAY_TOKEN_PATTERN)
  const client = await openWebSocket(record.url)
  expect(client.readyState).toBe(client.OPEN)
  return url
}

const RUNTIME_DIRECTORY_VARIABLE = 'XDG_RUNTIME_DIR'
const REGISTRY_DIRECTORY_NAME = 'foldkit-devtools-relays'

const withRuntimeDirectory = (runtimeDirectory: string) => {
  const previousRuntimeDirectory = process.env[RUNTIME_DIRECTORY_VARIABLE]
  process.env[RUNTIME_DIRECTORY_VARIABLE] = runtimeDirectory
  onTestFinished(() => {
    if (previousRuntimeDirectory === undefined) {
      delete process.env[RUNTIME_DIRECTORY_VARIABLE]
    } else {
      process.env[RUNTIME_DIRECTORY_VARIABLE] = previousRuntimeDirectory
    }
  })
  return join(runtimeDirectory, REGISTRY_DIRECTORY_NAME)
}

const maybeNetworkAddress = Array.findFirst(
  Object.values(networkInterfaces()).flatMap(addresses => addresses ?? []),
  address => address.family === 'IPv4' && !address.internal,
).pipe(Option.map(address => address.address))

describe('DevTools MCP relay', () => {
  useRelayRegistry()

  it(
    'releases its port when a middleware-mode dev server closes',
    async () => {
      const { server, relayPort } = await startOnConfiguredRelayPort(
        startMiddlewareModeServer,
      )
      const relayListener = listenerOn(relayPort)

      await server.close()

      expect(relayListener.listening).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps an event for the replaced server out of the replacement',
    async () => {
      const server = await startListeningServer({})
      // NOTE: Vite restarts a server in place, so a copy taken now keeps the
      // replaced server's config and hot channel after the restart.
      const replacedServer: ViteDevServer = { ...server }
      const plugin = replacedServer.config.plugins.find(
        candidate => candidate.name === 'foldkit',
      )
      if (
        plugin === undefined ||
        !Predicate.isFunction(plugin.handleHotUpdate)
      ) {
        throw new Error(
          'expected the foldkit plugin with a handleHotUpdate hook',
        )
      }

      await server.restart()
      expect(server.config).not.toBe(replacedServer.config)

      const client = await openHmrClient(serverPort(server))
      sendCustom(client, 'foldkit:preserve-model', {
        id: 'app',
        model: { count: 1 },
        isReloadFlush: false,
      })
      expect(await requestModel(client, 'marker')).toBeUndefined()

      const hotUpdate: HmrContext = {
        file: join(PACKAGE_ROOT, 'src', 'index.ts'),
        timestamp: Date.now(),
        modules: [await server.moduleGraph.ensureEntryFromUrl('/src/index.ts')],
        read: () => '',
        server: replacedServer,
      }
      plugin.handleHotUpdate.call(pluginContext, hotUpdate)

      expect(await requestModel(client, 'app')).toBeUndefined()
    },
    TEST_TIMEOUT,
  )

  it(
    'closes connected MCP clients when the dev server closes',
    async () => {
      const { server, relayPort } = await startOnConfiguredRelayPort(
        startMiddlewareModeServer,
      )
      const client = await connectClient(relayPort)
      const relayListener = listenerOn(relayPort)

      await server.close()

      await expect.poll(() => client.readyState === client.CLOSED).toBe(true)
      expect(relayListener.listening).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'releases its port when a standalone dev server closes',
    async () => {
      const { server, relayPort } = await startOnConfiguredRelayPort(
        startStandaloneServer,
      )
      const relayListener = listenerOn(relayPort)

      await server.close()

      expect(relayListener.listening).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'hands the relay over to the replacement when a dev server restarts',
    async () => {
      const { server, relayPort } = await startOnConfiguredRelayPort(
        startMiddlewareModeServer,
      )

      await server.restart()

      await waitUntilRelayListening(relayPort)
      const client = await connectClient(relayPort)
      expect(client.readyState).toBe(client.OPEN)
      const relayListener = listenerOn(relayPort)

      await server.close()

      expect(relayListener.listening).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'serves Model-preservation requests while a contended bind is still retrying',
    async () => {
      const port = await holdFreePort()
      const server = await startStandaloneServer(port)

      await expect(
        Promise.race([
          requestPreservedModel(serverPort(server)),
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
      const port = await holdFreePort()
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

describe('DevTools MCP relay discovery', () => {
  const directories = useRelayRegistry()

  it(
    'publishes a loopback relay of its own for a dev server',
    async () => {
      const server = await startListeningServer({})
      const root = server.config.root

      const record = await waitUntilPublished(root)

      expect(record.pid).toBe(process.pid)
      const url = await expectOwnLoopbackRelay(
        record,
        Option.some(serverPort(server)),
      )
      const relayListener = listenerOn(Number(url.port))

      await server.close()

      expect(await publishedRecords(root)).toStrictEqual([])
      expect(relayListener.listening).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'refuses a relay connection that lacks the published token',
    async () => {
      const server = await startListeningServer({})
      const record = await waitUntilPublished(server.config.root)

      const withoutToken = new URL(record.url)
      withoutToken.searchParams.delete('token')
      expect(await connectionRefused(withoutToken.toString())).toBe(true)

      const wrongToken = new URL(record.url)
      wrongToken.searchParams.set('token', '0'.repeat(64))
      expect(await connectionRefused(wrongToken.toString())).toBe(true)

      expect(await connectionRefused(record.url)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'refuses a middleware-mode relay connection that lacks the token',
    async () => {
      const server = await startMiddlewareServer({})
      const record = await waitUntilPublished(server.config.root)

      const withoutToken = new URL(record.url)
      withoutToken.searchParams.delete('token')
      expect(await connectionRefused(withoutToken.toString())).toBe(true)

      expect(await connectionRefused(record.url)).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'leaves other upgrades on the dev server to Vite',
    async () => {
      const server = await startListeningServer({})
      await waitUntilPublished(server.config.root)

      await expect(
        Promise.race([
          requestPreservedModel(serverPort(server)),
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
    'publishes a loopback relay of its own for a middleware-mode server',
    async () => {
      const server = await startMiddlewareServer({})
      const root = server.config.root

      const record = await waitUntilPublished(root)

      const url = await expectOwnLoopbackRelay(record, Option.none())
      const relayListener = listenerOn(Number(url.port))

      await server.close()

      expect(await publishedRecords(root)).toStrictEqual([])
      expect(relayListener.listening).toBe(false)
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps a configured port on a socket of its own and publishes it',
    async () => {
      const { server, relayPort } = await startOnConfiguredRelayPort(
        devToolsMcpPort => startListeningServer({ devToolsMcpPort }),
      )

      const record = await waitUntilPublished(server.config.root)

      expect(record.url).toBe(`ws://localhost:${relayPort}`)
      await waitUntilRelayListening(relayPort)
    },
    TEST_TIMEOUT,
  )

  it(
    'publishes a loopback relay of its own for an HTTPS dev server',
    async () => {
      const server = await startListeningServer({}, [basicSsl()])
      expect(server.config.server.https).toBeDefined()

      const record = await waitUntilPublished(server.config.root)

      await expectOwnLoopbackRelay(record, Option.some(serverPort(server)))
    },
    TEST_TIMEOUT,
  )

  it(
    'starts no relay when the option is false',
    async () => {
      const server = await startMiddlewareServer({ devToolsMcpPort: false })

      await settle()

      expect(await publishedRecords(server.config.root)).toStrictEqual([])
    },
    TEST_TIMEOUT,
  )

  it(
    'publishes a new relay when a dev server restarts',
    async () => {
      const server = await startListeningServer({})
      const root = server.config.root
      const before = await waitUntilPublished(root)
      const beforeUrl = new URL(before.url)
      const replacedListener = listenerOn(Number(beforeUrl.port))

      await server.restart()

      await expect
        .poll(
          async () =>
            (await publishedRecords(root)).map(({ id }) => id).join() !==
            before.id,
          { timeout: POLL_TIMEOUT },
        )
        .toBe(true)
      const after = await waitUntilPublished(root)
      const afterUrl = new URL(after.url)
      expect(after.id).not.toBe(before.id)
      expect(afterUrl.searchParams.get('token')).not.toBe(
        beforeUrl.searchParams.get('token'),
      )
      expect(replacedListener.listening).toBe(false)
      const withReplacedToken = new URL(after.url)
      withReplacedToken.search = beforeUrl.search
      expect(await connectionRefused(withReplacedToken.toString())).toBe(true)
      const client = await openWebSocket(after.url)
      expect(client.readyState).toBe(client.OPEN)

      await server.close()

      expect(await publishedRecords(root)).toStrictEqual([])
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps the replacement relay published across a middleware-mode restart',
    async () => {
      const server = await startMiddlewareServer({})
      const root = server.config.root
      const before = await waitUntilPublished(root)
      const replacedListener = listenerOn(Number(new URL(before.url).port))

      await server.restart()

      await expect
        .poll(
          async () =>
            (await publishedRecords(root)).map(({ id }) => id).join() !==
            before.id,
          { timeout: POLL_TIMEOUT },
        )
        .toBe(true)
      const after = await waitUntilPublished(root)
      const client = await openWebSocket(after.url)
      expect(client.readyState).toBe(client.OPEN)
      expect(replacedListener.listening).toBe(false)

      await server.close()

      expect(await publishedRecords(root)).toStrictEqual([])
    },
    TEST_TIMEOUT,
  )

  it(
    'publishes under XDG_RUNTIME_DIR when no registry directory is configured',
    async () => {
      const runtimeDirectory = withRuntimeDirectory(directories.registry)
      delete process.env[RELAY_DIRECTORY_VARIABLE]
      const server = await startMiddlewareServer({})

      await expect
        .poll(() => readdir(runtimeDirectory).catch(() => []), {
          timeout: POLL_TIMEOUT,
        })
        .toHaveLength(1)
      expect(
        (await publishedRecords(server.config.root)).map(({ root }) => root),
      ).toStrictEqual([server.config.root])
    },
    TEST_TIMEOUT,
  )

  it.skipIf(process.getuid === undefined)(
    'refuses a registry directory that other users can read',
    async () => {
      silenceRelayErrors()
      await chmod(directories.registry, 0o755)
      await startMiddlewareServer({})

      await expect
        .poll(() => loggedLines(console.error), {
          timeout: POLL_TIMEOUT,
        })
        .toContainEqual(
          expect.stringContaining('is readable or writable by other users'),
        )
      expect(loggedLines(console.log)).toContainEqual(
        expect.stringContaining('MCP relay listening at'),
      )
      expect(await readdir(directories.registry)).toEqual([])
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps listening and names the remedy when the registry cannot be written',
    async () => {
      silenceRelayErrors()
      const notADirectory = join(directories.registry, 'registry-file')
      await writeFile(notADirectory, '', 'utf-8')
      process.env[RELAY_DIRECTORY_VARIABLE] = notADirectory
      await startMiddlewareServer({})

      await expect
        .poll(() => loggedLines(console.error), {
          timeout: POLL_TIMEOUT,
        })
        .toContainEqual(
          expect.stringContaining('the registry could not be written'),
        )
      expect(loggedLines(console.error)).toContainEqual(
        expect.stringContaining('FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'),
      )
      expect(loggedLines(console.log)).toContainEqual(
        expect.stringContaining('MCP relay listening at'),
      )
    },
    TEST_TIMEOUT,
  )

  it.skipIf(process.getuid === undefined)(
    'the ownership check refuses a directory owned by another user',
    async () => {
      const maybeCurrentUid = Option.fromNullishOr(process.getuid?.())
      const info = await Effect.runPromise(
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem
          return yield* fileSystem.stat(directories.registry)
        }).pipe(Effect.provide(NodeServices.layer)),
      )
      const ownedByAnother = {
        ...info,
        uid: Option.map(maybeCurrentUid, uid => uid + 1),
      }

      expect(relayRegistryDirectoryRefusal(info, maybeCurrentUid)).toEqual(
        Option.none(),
      )
      expect(
        relayRegistryDirectoryRefusal(ownedByAnother, maybeCurrentUid),
      ).toEqual(Option.some('is owned by another user'))
      expect(
        relayRegistryDirectoryRefusal(ownedByAnother, Option.none()),
      ).toEqual(Option.some('has ownership that cannot be verified'))
    },
    TEST_TIMEOUT,
  )

  it('refuses a registry directory when ownership cannot be verified', async () => {
    const info = await Effect.runPromise(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem
        return yield* fileSystem.stat(directories.registry)
      }).pipe(Effect.provide(NodeServices.layer)),
    )
    const privateMode = { ...info, mode: 0o700, uid: Option.none<number>() }
    const sharedMode = { ...info, mode: 0o755, uid: Option.some(42) }

    expect(relayRegistryDirectoryRefusal(privateMode, Option.some(42))).toEqual(
      Option.some('has ownership that cannot be verified'),
    )
    expect(relayRegistryDirectoryRefusal(sharedMode, Option.none())).toEqual(
      Option.some('has ownership that cannot be verified'),
    )
  })

  it.skipIf(Option.isNone(maybeNetworkAddress))(
    'publishes a loopback relay of its own for a dev server bound to a network address',
    async () => {
      const host = Option.getOrThrow(maybeNetworkAddress)
      const server = await startListeningServer({}, [], host)

      const record = await waitUntilPublished(server.config.root)

      await expectOwnLoopbackRelay(record, Option.some(serverPort(server)))
    },
    TEST_TIMEOUT,
  )

  it(
    'publishes each relay under its own id and retires only that one',
    async () => {
      const root = '/workspace/owned'
      const first: RelayRecord = {
        version: 1,
        id: 'first',
        root,
        url: 'ws://localhost:9988',
        pid: process.pid,
        startedAt: 1,
      }
      const second: RelayRecord = { ...first, id: 'second', startedAt: 2 }
      await runRegistry(publish(first))
      await runRegistry(publish(second))

      expect(
        Array.sort(await readdir(directories.registry), Order.String),
      ).toStrictEqual(['first.json', 'second.json'])

      await runRegistry(retireRelayRecord(second.id))

      expect(await publishedRecords(root)).toStrictEqual([first])
    },
    TEST_TIMEOUT,
  )

  it(
    'writes a record the RelayRecord Schema decodes',
    async () => {
      const server = await startMiddlewareServer({})
      const record = await waitUntilPublished(server.config.root)

      const raw = await readFile(
        join(directories.registry, `${encodeURIComponent(record.id)}.json`),
        'utf-8',
      )

      expect(decodeRelayRecordJson(raw)).toStrictEqual({
        version: 1,
        id: record.id,
        root: server.config.root,
        url: record.url,
        pid: process.pid,
        startedAt: record.startedAt,
      })
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps the first record when a second dev server for the same root stops',
    async () => {
      const first = await startListeningServer({})
      const root = first.config.root
      const firstRecord = await waitUntilPublished(root)
      const second = await startListeningServer({})
      await expect
        .poll(async () => (await publishedRecords(root)).length, {
          timeout: POLL_TIMEOUT,
        })
        .toBe(2)

      await second.close()

      expect(await publishedRecords(root)).toStrictEqual([firstRecord])
    },
    TEST_TIMEOUT,
  )

  it(
    'removes the record of a dev server that is gone when it publishes',
    async () => {
      await writeFile(
        join(directories.registry, 'gone.json'),
        JSON.stringify({
          version: 1,
          id: 'gone',
          root: PACKAGE_ROOT,
          url: 'ws://127.0.0.1:1/__foldkit/devtools-mcp?token=gone',
          pid: DEAD_PID,
          startedAt: 1,
        }),
      )

      const server = await startMiddlewareServer({})
      const record = await waitUntilPublished(server.config.root)

      expect(await readdir(directories.registry)).toStrictEqual([
        `${encodeURIComponent(record.id)}.json`,
      ])
    },
    TEST_TIMEOUT,
  )

  it(
    'keeps a record an older relay republishes while a dead one is removed',
    async () => {
      const legacyPath = join(directories.registry, 'legacy.json')
      const dead: RelayRecord = {
        version: 1,
        id: 'dead',
        root: '/workspace/legacy',
        url: 'ws://localhost:9988',
        pid: DEAD_PID,
        startedAt: 1,
      }
      const republished: RelayRecord = {
        ...dead,
        id: 'republished',
        pid: process.pid,
        startedAt: 2,
      }
      const published: RelayRecord = {
        ...dead,
        id: 'published',
        root: '/workspace/current',
        pid: process.pid,
        startedAt: 3,
      }
      await writeFile(legacyPath, JSON.stringify(dead), 'utf-8')

      await runRegistry(
        Effect.gen(function* () {
          const fileSystem = yield* FileSystem.FileSystem
          const interleavedFileSystem: FileSystem.FileSystem = {
            ...fileSystem,
            rename: (fromPath, toPath) =>
              Effect.gen(function* () {
                if (toPath.endsWith('.retiring')) {
                  yield* fileSystem.writeFileString(
                    fromPath,
                    JSON.stringify(republished),
                  )
                }
                yield* fileSystem.rename(fromPath, toPath)
              }),
          }

          yield* publish(published).pipe(
            Effect.provideService(FileSystem.FileSystem, interleavedFileSystem),
          )
        }),
      )

      expect(JSON.parse(await readFile(legacyPath, 'utf-8'))).toStrictEqual(
        republished,
      )
      expect(
        Array.sort(await readdir(directories.registry), Order.String),
      ).toStrictEqual(['legacy.json', 'published.json'])
    },
    TEST_TIMEOUT,
  )
})
