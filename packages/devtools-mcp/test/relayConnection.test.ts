import { ConfigProvider, Effect, Option, Schedule } from 'effect'
import { Request } from 'foldkit/devtools-protocol'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer as createNetServer } from 'node:net'
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

import * as NodeServices from '@effect/platform-node/NodeServices'
import { foldkit } from '@foldkit/vite-plugin'

import { resolveRelayUrl } from '../src/relayLocation.ts'
import { discoverRelay } from '../src/relayRegistry.ts'
import {
  type WebSocketClient,
  connectWebSocketClient,
} from '../src/webSocketClient.ts'

const RELAY_DIRECTORY_VARIABLE = 'FOLDKIT_DEVTOOLS_RELAY_DIRECTORY'
const PACKAGE_ROOT = resolve(import.meta.dirname, '..')
const TEST_TIMEOUT = 30_000

const findFreePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const probe = createNetServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port =
        address === null || typeof address === 'string' ? 0 : address.port
      probe.close(() => resolvePort(port))
    })
  })

// The two packages meet only through the registry and the relay socket, so
// this runs a real dev server with the plugin and drives the MCP server's own
// discovery and connection code against it.
describe('relay connection', () => {
  let registryDirectory = ''
  let previousRegistryDirectory: string | undefined

  beforeEach(async () => {
    previousRegistryDirectory = process.env[RELAY_DIRECTORY_VARIABLE]
    registryDirectory = await mkdtemp(join(tmpdir(), 'foldkit-mcp-relay-'))
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
    'discovers the relay, connects, and follows a dev server restart',
    async () => {
      const port = await findFreePort()
      const server = await createServer({
        root: PACKAGE_ROOT,
        configFile: false,
        logLevel: 'silent',
        server: { port, strictPort: true, host: '127.0.0.1' },
        plugins: [foldkit()],
      })
      onTestFinished(() => server.close().catch(() => undefined))
      await server.listen()

      const settings = {
        maybeConfiguredPort: Option.none<string>(),
        maybeConfiguredHost: Option.none<string>(),
        projectRoot: PACKAGE_ROOT,
      }
      // The relay answers this request itself, so it proves the socket is up
      // without a browser tab behind it.
      const listRuntimes = (client: WebSocketClient) =>
        client.sendRequest(Request.RequestListRuntimes(), Option.none()).pipe(
          Effect.retry({
            schedule: Schedule.spaced('250 millis'),
            times: 60,
          }),
        )
      // The plugin publishes once the server listens, a moment after
      // `listen` resolves, so both reads wait for the record they expect.
      const publishedToken = (differentFrom: string | undefined) =>
        discoverRelay(PACKAGE_ROOT).pipe(
          Effect.flatMap(maybeRecord =>
            Option.match(
              Option.filter(
                Option.map(maybeRecord, record =>
                  new URL(record.url).searchParams.get('token'),
                ),
                (token): token is string =>
                  token !== null && token !== differentFrom,
              ),
              {
                onNone: () => Effect.fail(new Error('no new relay published')),
                onSome: token => Effect.succeed(token),
              },
            ),
          ),
          Effect.retry({ schedule: Schedule.spaced('100 millis'), times: 100 }),
        )

      await Effect.runPromise(
        Effect.gen(function* () {
          const before = yield* publishedToken(undefined)
          const client = yield* connectWebSocketClient(
            resolveRelayUrl(settings),
          )

          const first = yield* listRuntimes(client)
          expect(first._tag).toBe('ResponseRuntimes')

          yield* Effect.promise(() => server.restart())
          const after = yield* publishedToken(before)
          expect(after).not.toBe(before)

          // The old socket is gone with the old server, so this answer comes
          // from a connection the client made to the replacement on its own.
          const second = yield* listRuntimes(client)
          expect(second._tag).toBe('ResponseRuntimes')

          yield* client.close
        }).pipe(
          Effect.provideService(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromEnv(),
          ),
          Effect.provide(NodeServices.layer),
        ),
      )
    },
    TEST_TIMEOUT,
  )
})
