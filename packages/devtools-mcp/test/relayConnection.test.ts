import { Array, Effect, Exit, Option } from 'effect'
import { createServer as createNetServer } from 'node:net'
import { join } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'

import { makeRelayClient } from '../src/relayClient.ts'
import type { RelayTarget } from '../src/relayLocation.ts'
import { boundPort } from './boundPort.ts'
import {
  POLL_TIMEOUT,
  connectionCount,
  listedIds,
  loggedErrors,
  openBrowserRuntime,
  openSession,
  startApplication,
  useWorkspace,
} from './relayFixtures.ts'

const TEST_TIMEOUT = 30_000
const IDLE_WINDOW = 500
const CALL_COUNT = 3
const CLOSE_DELAY = 100
const CONNECT_TIMEOUT = 2_000

const workspace = useWorkspace()

const fixedTarget = (url: string): RelayTarget => ({
  key: url,
  url,
  maybeProjectRoot: Option.none(),
})

const startRelay = async (onConnection: (socket: WebSocket) => void) => {
  const relay = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  onTestFinished(() => new Promise<void>(done => relay.close(() => done())))
  await new Promise<void>(resolveListening =>
    relay.once('listening', () => resolveListening()),
  )
  const port = Option.getOrThrowWith(
    boundPort(relay.address()),
    () => new Error('relay has no port'),
  )
  relay.on('connection', onConnection)
  return `ws://127.0.0.1:${port}`
}

const runtimesResponse = (connectionId: string) => ({
  _tag: 'ResponseRuntimes',
  runtimes: [{ connectionId, url: 'http://app/', title: connectionId }],
})

const startAnsweringRelay = async (response: unknown) => {
  const connections: Array<WebSocket> = []
  const url = await startRelay(socket => {
    connections.push(socket)
    socket.on('message', raw => {
      const { id } = JSON.parse(raw.toString())
      socket.send(JSON.stringify({ id, response }))
    })
  })
  return { url, connections }
}

const firstConnection = (connections: ReadonlyArray<WebSocket>): WebSocket =>
  Option.getOrThrowWith(
    Array.head(connections),
    () => new Error('the relay has no connection'),
  )

const openClient = async (
  resolveTargets: Effect.Effect<ReadonlyArray<RelayTarget>>,
) => {
  const client = await Effect.runPromise(makeRelayClient(resolveTargets))
  onTestFinished(() => Effect.runPromise(client.close))
  return client
}

const startDroppingRelay = async () => {
  const connections = { count: 0 }
  const url = await startRelay(socket => {
    connections.count += 1
    socket.close()
  })
  return { url, connections }
}

const startStalledServer = async () => {
  const stalled = createNetServer(socket => {
    socket.resume()
  })
  onTestFinished(() => new Promise<void>(done => stalled.close(() => done())))
  await new Promise<void>(resolveListening =>
    stalled.listen(0, '127.0.0.1', () => resolveListening()),
  )
  const port = Option.getOrThrowWith(
    boundPort(stalled.address()),
    () => new Error('server has no port'),
  )
  return `ws://127.0.0.1:${port}`
}

it(
  'connects on the first call after the dev server starts',
  async () => {
    const application = join(workspace.root, 'application')
    const session = await openSession(application)

    await expect(listedIds(session)).rejects.toThrow(
      'Not connected to a Foldkit dev server',
    )

    const server = await startApplication(application)
    await openBrowserRuntime(server, 'runtime-application')

    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-application'])
    expect(await listedIds(session)).toStrictEqual(['runtime-application'])
    expect(connectionCount()).toBe(1)
  },
  TEST_TIMEOUT,
)

it(
  'follows a dev server restart on the next call',
  async () => {
    const application = join(workspace.root, 'application')
    const server = await startApplication(application)
    const session = await openSession(application)
    expect(await listedIds(session)).toStrictEqual([])

    await server.restart()

    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual([])
    expect(connectionCount()).toBe(2)
  },
  TEST_TIMEOUT,
)

it(
  'opens at most one connection per call to a relay that drops each one',
  async () => {
    const relay = await startDroppingRelay()
    const client = await openClient(Effect.succeed([fixedTarget(relay.url)]))

    await new Promise(done => setTimeout(done, IDLE_WINDOW))
    expect(relay.connections.count).toBe(0)

    await Effect.runPromise(
      Effect.forEach(
        Array.range(1, CALL_COUNT),
        () => Effect.exit(client.listRuntimes),
        { discard: true },
      ),
    )
    await new Promise(done => setTimeout(done, IDLE_WINDOW))

    expect(relay.connections.count).toBeGreaterThan(0)
    expect(relay.connections.count).toBeLessThanOrEqual(CALL_COUNT)
  },
  TEST_TIMEOUT,
)

it(
  'reports a relay that does not answer a listing and lists nothing from it',
  async () => {
    const url = await startRelay(() => {})
    const client = await openClient(Effect.succeed([fixedTarget(url)]))

    expect(await Effect.runPromise(client.listRuntimes)).toStrictEqual([])
    expect(loggedErrors()).toContainEqual(
      expect.stringContaining(
        `[foldkit-devtools-mcp] listing runtimes at ${url}/ failed: `,
      ),
    )
  },
  TEST_TIMEOUT,
)

it(
  'reports the reason a relay gives for refusing a listing and lists nothing from it',
  async () => {
    const relay = await startAnsweringRelay({
      _tag: 'ResponseError',
      reason: 'listing refused',
    })
    const client = await openClient(Effect.succeed([fixedTarget(relay.url)]))

    expect(await Effect.runPromise(client.listRuntimes)).toStrictEqual([])
    expect(loggedErrors()).toContainEqual(
      `[foldkit-devtools-mcp] listing runtimes at ${relay.url}/ failed: listing refused`,
    )
  },
  TEST_TIMEOUT,
)

it(
  'reports a relay that answers a listing with another response and lists nothing from it',
  async () => {
    const relay = await startAnsweringRelay({ _tag: 'ResponseResumed' })
    const client = await openClient(Effect.succeed([fixedTarget(relay.url)]))

    expect(await Effect.runPromise(client.listRuntimes)).toStrictEqual([])
    expect(loggedErrors()).toContainEqual(
      `[foldkit-devtools-mcp] listing runtimes at ${relay.url}/ failed: the relay answered ResponseResumed`,
    )
  },
  TEST_TIMEOUT,
)

it(
  'reconnects to a published relay that closed its connection',
  async () => {
    const relay = await startAnsweringRelay(runtimesResponse('runtime-relay'))
    const client = await openClient(Effect.succeed([fixedTarget(relay.url)]))
    expect(await listedIds(client)).toStrictEqual(['runtime-relay'])

    const closedConnection = firstConnection(relay.connections)
    await new Promise(done => {
      closedConnection.once('close', done)
      closedConnection.close()
    })

    expect(await listedIds(client)).toStrictEqual(['runtime-relay'])
    expect(relay.connections).toHaveLength(2)
  },
  TEST_TIMEOUT,
)

it(
  'closes its connection to a relay that is no longer published',
  async () => {
    const kept = await startAnsweringRelay(runtimesResponse('runtime-kept'))
    const retired = await startAnsweringRelay(
      runtimesResponse('runtime-retired'),
    )
    const registry = {
      targets: [fixedTarget(retired.url), fixedTarget(kept.url)],
    }
    const client = await openClient(Effect.sync(() => registry.targets))
    expect(await listedIds(client)).toStrictEqual([
      'runtime-kept',
      'runtime-retired',
    ])

    registry.targets = [fixedTarget(kept.url)]

    expect(await listedIds(client)).toStrictEqual(['runtime-kept'])
    await expect
      .poll(() => firstConnection(retired.connections).readyState, {
        timeout: POLL_TIMEOUT,
      })
      .toBe(WebSocket.CLOSED)
    expect(firstConnection(kept.connections).readyState).toBe(WebSocket.OPEN)
  },
  TEST_TIMEOUT,
)

it(
  'closes only after a call still connecting fails at the connect timeout, without an uncaught error',
  async () => {
    const url = await startStalledServer()
    const uncaught: Array<unknown> = []
    const onUncaught = (error: unknown) => uncaught.push(error)
    process.on('uncaughtException', onUncaught)
    onTestFinished(() => {
      process.off('uncaughtException', onUncaught)
    })
    const client = await Effect.runPromise(
      makeRelayClient(Effect.succeed([fixedTarget(url)])),
    )
    const settledOperations: Array<string> = []

    const startedAt = Date.now()
    const pending = Effect.runPromise(Effect.exit(client.listRuntimes)).then(
      exit => {
        settledOperations.push('listRuntimes')
        return exit
      },
    )
    await new Promise(done => setTimeout(done, CLOSE_DELAY))
    await Effect.runPromise(client.close)
    settledOperations.push('close')
    const exit = await pending
    await new Promise(done => setTimeout(done, CLOSE_DELAY))

    expect(settledOperations).toStrictEqual(['listRuntimes', 'close'])
    expect(Exit.isFailure(exit)).toBe(true)
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(CONNECT_TIMEOUT)
    expect(uncaught).toStrictEqual([])
  },
  TEST_TIMEOUT,
)
