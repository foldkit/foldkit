import {
  Array,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  Option,
  pipe,
} from 'effect'
import { Request } from 'foldkit/devtools-protocol'
import type { IncomingMessage } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { join } from 'node:path'
import { expect, it, onTestFinished, vi } from 'vitest'
import { WebSocket, WebSocketServer } from 'ws'

import { makeRelayClient } from '../src/relayClient.ts'
import type { RelayTarget } from '../src/relayLocation.ts'
import { buildTools } from '../src/tools.ts'
import { boundPort } from './boundPort.ts'
import {
  NOT_CONNECTED,
  POLL_TIMEOUT,
  connectionCount,
  listedIds,
  loggedErrors,
  openBrowserRuntime,
  openSession,
  silenceRelayErrors,
  startApplication,
  useWorkspace,
} from './relayFixtures.ts'

const TEST_TIMEOUT = 30_000
const IDLE_WINDOW = 500
const CALL_COUNT = 3
const CLOSE_DELAY = 100
const CONNECT_TIMEOUT = 2_000
const CONCURRENT_CALL_COUNT = 10
const JOIN_DELAY = 100
const FAILURE_BUDGET = Duration.seconds(2)
const UNPARSEABLE_RELAY_URL = 'ws://relay host:9988'
const INVALID_ADDRESS_REASON = 'the relay address is not a valid URL'
const CONNECTED_PREFIX = '[foldkit-devtools-mcp] connected to '

const workspace = useWorkspace()

const fixedTarget = (url: string): RelayTarget => ({
  key: url,
  url,
  maybeProjectRoot: Option.none(),
})

const startRelay = async (
  onConnection: (socket: WebSocket, request: IncomingMessage) => void,
) => {
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

const startRuntimeRelay = async (connectionId: string) => {
  const listings = { count: 0 }
  const url = await startRelay(socket => {
    socket.on('message', raw => {
      const { id, request } = JSON.parse(raw.toString())

      if (request._tag === 'RequestListRuntimes') {
        listings.count += 1
        socket.send(
          JSON.stringify({ id, response: runtimesResponse(connectionId) }),
        )
      } else {
        socket.send(
          JSON.stringify({ id, response: { _tag: 'ResponseResumed' } }),
        )
      }
    })
  })

  return { url, listings }
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

    await expect(listedIds(session)).rejects.toThrow(NOT_CONNECTED)

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
  'closes an unfinished connection promptly without an uncaught error',
  async () => {
    const url = await startStalledServer()
    const uncaught: Array<unknown> = []
    const onUncaught = (error: unknown) => uncaught.push(error)
    process.on('uncaughtException', onUncaught)
    onTestFinished(() => {
      process.off('uncaughtException', onUncaught)
    })
    const client = await openClient(Effect.succeed([fixedTarget(url)]))
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
    expect(Date.now() - startedAt).toBeLessThan(CONNECT_TIMEOUT)
    expect(uncaught).toStrictEqual([])
  },
  TEST_TIMEOUT,
)

it(
  'shares one registry lookup among concurrent calls and starts it after each call arrives',
  async () => {
    const before = await startAnsweringRelay(runtimesResponse('runtime-before'))
    const after = await startAnsweringRelay(runtimesResponse('runtime-after'))
    const registry = { targets: [fixedTarget(before.url)], lookups: 0 }
    const firstLookupReleased = Deferred.makeUnsafe<void>()
    const resolveTargets = Effect.gen(function* () {
      registry.lookups += 1
      const { targets } = registry

      if (registry.lookups === 1) {
        yield* Deferred.await(firstLookupReleased)
      }

      return targets
    })
    const client = await openClient(resolveTargets)
    const settle = () => new Promise(done => setTimeout(done, JOIN_DELAY))

    const concurrentCalls = Array.makeBy(CONCURRENT_CALL_COUNT, () =>
      listedIds(client),
    )
    await settle()
    registry.targets = [fixedTarget(after.url)]
    const laterCall = listedIds(client)
    await settle()
    Deferred.doneUnsafe(firstLookupReleased, Effect.void)

    await Promise.all(concurrentCalls)
    expect(registry.lookups).toBeLessThanOrEqual(2)
    expect(await laterCall).toStrictEqual(['runtime-after'])
  },
  TEST_TIMEOUT,
)

it('lets a caller cancel without cancelling another registry lookup', async () => {
  const relay = await startAnsweringRelay(runtimesResponse('runtime'))
  const started = Deferred.makeUnsafe<void>()
  const released = Deferred.makeUnsafe<void>()
  const client = await openClient(
    Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined)
      yield* Deferred.await(released)

      return [fixedTarget(relay.url)]
    }),
  )
  const firstCall = Effect.runFork(client.listRuntimes)
  await Effect.runPromise(Deferred.await(started))
  const otherCall = listedIds(client)
  const interrupted = Effect.runPromise(Fiber.interrupt(firstCall))
  const isInterruptedPromptly = await Promise.race([
    interrupted.then(() => true),
    new Promise<boolean>(resolve =>
      setTimeout(() => resolve(false), CLOSE_DELAY),
    ),
  ])

  Deferred.doneUnsafe(released, Effect.void)
  await interrupted
  const runtimes = await otherCall

  expect(isInterruptedPromptly).toBe(true)
  expect(runtimes).toStrictEqual(['runtime'])
})

it('closes while registry lookups are running or queued', async () => {
  const started = Deferred.makeUnsafe<void>()
  const released = Deferred.makeUnsafe<void>()
  const client = await openClient(
    Effect.gen(function* () {
      yield* Deferred.succeed(started, undefined)
      yield* Deferred.await(released)

      return []
    }),
  )
  const firstCall = Effect.runPromise(Effect.exit(client.listRuntimes))
  await Effect.runPromise(Deferred.await(started))
  const otherCall = Effect.runPromise(Effect.exit(client.listRuntimes))
  const joinedCall = Effect.runPromise(Effect.exit(client.listRuntimes))
  const closed = Effect.runPromise(client.close)
  const isClosedPromptly = await Promise.race([
    closed.then(() => true),
    new Promise<boolean>(resolve =>
      setTimeout(() => resolve(false), CLOSE_DELAY),
    ),
  ])

  Deferred.doneUnsafe(released, Effect.void)
  await closed
  const exits = await Promise.all([firstCall, otherCall, joinedCall])

  expect(isClosedPromptly).toBe(true)
  expect(exits.every(Exit.isFailure)).toBe(true)
})

it('fails a pending Runtime request when the client closes', async () => {
  const received = Deferred.makeUnsafe<void>()
  const url = await startRelay(socket => {
    socket.on('message', raw => {
      const { id, request } = JSON.parse(raw.toString())

      if (request._tag === 'RequestListRuntimes') {
        socket.send(
          JSON.stringify({ id, response: runtimesResponse('runtime') }),
        )
      } else {
        Deferred.doneUnsafe(received, Effect.void)
      }
    })
  })
  const client = await openClient(Effect.succeed([fixedTarget(url)]))
  const call = Effect.runFork(
    client.sendRequest(Request.RequestResume(), Option.some('runtime')),
  )
  await Effect.runPromise(Deferred.await(received))
  await Effect.runPromise(client.close)
  const settled = Effect.runPromise(Fiber.await(call))
  const isSettledPromptly = await Promise.race([
    settled.then(() => true),
    new Promise<boolean>(resolve =>
      setTimeout(() => resolve(false), CLOSE_DELAY),
    ),
  ])

  await Effect.runPromise(Fiber.interrupt(call))
  const exit = await settled

  expect(isSettledPromptly).toBe(true)
  expect(Exit.isFailure(exit)).toBe(true)
})

it(
  'looks up the registry and lists each relay once per tool call',
  async () => {
    const relay = await startRuntimeRelay('runtime-relay')
    const registry = { lookups: 0 }
    const client = await openClient(
      Effect.sync(() => {
        registry.lookups += 1

        return [fixedTarget(relay.url)]
      }),
    )
    const resume = pipe(
      buildTools(client),
      Array.findFirst(({ name }) => name === 'foldkit_resume'),
      Option.getOrThrowWith(() => new Error('tool foldkit_resume is missing')),
    )

    expect(
      JSON.stringify(await Effect.runPromise(resume.handle({}))),
    ).toContain('ResponseResumed')
    expect(registry.lookups).toBe(1)
    expect(relay.listings.count).toBe(1)

    expect(
      JSON.stringify(
        await Effect.runPromise(resume.handle({ runtime_id: 'runtime-relay' })),
      ),
    ).toContain('ResponseResumed')
    expect(registry.lookups).toBe(2)
    expect(relay.listings.count).toBe(2)
  },
  TEST_TIMEOUT,
)

it(
  'fails every concurrent call promptly when the relay address cannot be parsed',
  async () => {
    const client = await openClient(
      Effect.as(Effect.sleep(Duration.millis(JOIN_DELAY)), [
        fixedTarget(UNPARSEABLE_RELAY_URL),
      ]),
    )
    const failedCall = client.listRuntimes.pipe(
      Effect.flip,
      Effect.map(({ message }) => message),
      Effect.catchDefect(defect => Effect.succeed(`died: ${String(defect)}`)),
    )

    const failures = await Effect.runPromise(
      Effect.all(
        Array.makeBy(CONCURRENT_CALL_COUNT, () => failedCall),
        { concurrency: 'unbounded' },
      ).pipe(Effect.timeout(FAILURE_BUDGET)),
    )

    expect(failures).toStrictEqual(
      Array.makeBy(CONCURRENT_CALL_COUNT, () =>
        expect.stringContaining(NOT_CONNECTED),
      ),
    )
    expect(loggedErrors()).toContainEqual(
      `[foldkit-devtools-mcp] connect attempt to ${UNPARSEABLE_RELAY_URL} failed: ${INVALID_ADDRESS_REASON}`,
    )
  },
  TEST_TIMEOUT,
)

it(
  'does not send a registry token or tool request to a relay that cannot prove its identity',
  async () => {
    const token = 'a'.repeat(64)
    const receivedFrames: Array<string> = []
    const receivedUrls: Array<string> = []
    const url = await startRelay((socket, request) => {
      receivedUrls.push(request.url ?? '')
      socket.on('message', raw => receivedFrames.push(raw.toString()))
    })
    const client = await openClient(
      Effect.succeed([
        fixedTarget(`${url}/__foldkit/devtools-mcp?token=${token}`),
      ]),
    )

    await expect(listedIds(client)).rejects.toThrow(NOT_CONNECTED)

    expect(receivedUrls).toHaveLength(1)
    expect(receivedUrls.join()).not.toContain(token)
    expect(receivedFrames).toStrictEqual([])
    expect(loggedErrors()).toContainEqual(
      expect.stringContaining('the relay could not prove its identity'),
    )
  },
  TEST_TIMEOUT,
)

it(
  'logs an unparseable relay address without its token',
  async () => {
    const client = await openClient(
      Effect.succeed([fixedTarget(`${UNPARSEABLE_RELAY_URL}/?token=secret`)]),
    )

    await expect(listedIds(client)).rejects.toThrow(NOT_CONNECTED)

    expect(loggedErrors()).toContainEqual(
      `[foldkit-devtools-mcp] connect attempt to ${UNPARSEABLE_RELAY_URL}/ failed: ${INVALID_ADDRESS_REASON}`,
    )
    expect(
      loggedErrors().filter(line => line.includes('secret')),
    ).toStrictEqual([])
  },
  TEST_TIMEOUT,
)

it(
  'ends every concurrent call promptly with the defect of a registry lookup that dies',
  async () => {
    const client = await openClient(
      Effect.andThen(
        Effect.sleep(Duration.millis(JOIN_DELAY)),
        Effect.die(new Error('registry lookup died')),
      ),
    )
    const diedCall = client.listRuntimes.pipe(
      Effect.as('listed'),
      Effect.catchDefect(defect => Effect.succeed(String(defect))),
    )

    const outcomes = await Effect.runPromise(
      Effect.all(
        Array.makeBy(CONCURRENT_CALL_COUNT, () => diedCall),
        { concurrency: 'unbounded' },
      ).pipe(Effect.timeout(FAILURE_BUDGET)),
    )

    expect(outcomes).toStrictEqual(
      Array.makeBy(CONCURRENT_CALL_COUNT, () => 'Error: registry lookup died'),
    )
  },
  TEST_TIMEOUT,
)

it(
  'closes a connection that a refresh opened before it died',
  async () => {
    const relay = await startAnsweringRelay(runtimesResponse('runtime-relay'))
    const client = await openClient(Effect.succeed([fixedTarget(relay.url)]))
    vi.mocked(console.error).mockImplementation((...args) => {
      if (args.map(String).join(' ').startsWith(CONNECTED_PREFIX)) {
        throw new Error('stderr is closed')
      }
    })

    const outcome = await Effect.runPromise(
      client.listRuntimes.pipe(
        Effect.as('listed'),
        Effect.catchDefect(defect => Effect.succeed(String(defect))),
      ),
    )
    silenceRelayErrors()

    expect(outcome).toBe('Error: stderr is closed')
    expect(firstConnection(relay.connections).readyState).toBe(WebSocket.OPEN)

    await Effect.runPromise(client.close)

    await expect
      .poll(() => firstConnection(relay.connections).readyState, {
        timeout: POLL_TIMEOUT,
      })
      .toBe(WebSocket.CLOSED)
  },
  TEST_TIMEOUT,
)

it(
  'opens no connection and fails a call made after it closes',
  async () => {
    const relay = await startAnsweringRelay(runtimesResponse('runtime-relay'))
    const client = await openClient(Effect.succeed([fixedTarget(relay.url)]))
    expect(await listedIds(client)).toStrictEqual(['runtime-relay'])

    await Effect.runPromise(client.close)

    await expect(listedIds(client)).rejects.toThrow(NOT_CONNECTED)
    expect(relay.connections).toHaveLength(1)
  },
  TEST_TIMEOUT,
)
