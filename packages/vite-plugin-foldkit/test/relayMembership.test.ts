import { Array, Option } from 'effect'
import { type ViteDevServer, createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'
import type { RawData, WebSocket } from 'ws'

import { foldkit } from '../src/index.ts'
import {
  POLL_TIMEOUT,
  UNKNOWN_RUNTIME_FAILURE_BUDGET,
  announceRuntime,
  disconnectRuntime,
  listedRuntimeIds,
  loggedLines,
  openWebSocket,
  serverPort,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const SETTLE = 300
const TEST_TIMEOUT = 20_000
const FRAME_BURST = 20

const directories = useRelayRegistry()

const startServer = async () => {
  const server = await createServer({
    root: directories.root,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [foldkit()],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  const record = await waitUntilPublished(directories.root)

  return { server, record }
}

const openTab = (server: ViteDevServer) =>
  openWebSocket(`ws://127.0.0.1:${serverPort(server)}`, 'vite-hmr')

const closeTab = async (server: ViteDevServer, tab: WebSocket) => {
  const openTabCount = server.ws.clients.size
  tab.close()
  await expect
    .poll(() => server.ws.clients.size, { timeout: POLL_TIMEOUT })
    .toBe(openTabCount - 1)
}

const settle = () => new Promise(done => setTimeout(done, SETTLE))

const loggedLinesContaining = (text: string) =>
  loggedLines(console.log).filter(line => line.includes(text))

const receivedFrames = (socket: WebSocket) => {
  const frames: Array<unknown> = []
  socket.on('message', (raw: RawData) =>
    frames.push(JSON.parse(raw.toString())),
  )

  return frames
}

const receivedRequestFrames = (tab: WebSocket) => {
  const frames: Array<unknown> = []
  tab.on('message', (raw: RawData) => {
    const payload = JSON.parse(raw.toString())

    if (payload.event === 'foldkit:devTools:request') {
      frames.push(payload.data)
    }
  })

  return frames
}

it(
  'prunes the Runtimes that a closing socket announced last and that are still connected',
  async () => {
    const { server, record } = await startServer()
    const session = await openWebSocket(record.url)
    const firstTab = await openTab(server)
    const secondTab = await openTab(server)
    const thirdTab = await openTab(server)

    announceRuntime(firstTab, 'runtime-moved')
    await expect
      .poll(() => listedRuntimeIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-moved'])
    announceRuntime(secondTab, 'runtime-moved')
    announceRuntime(thirdTab, 'runtime-disposed')
    announceRuntime(thirdTab, 'runtime-live')
    disconnectRuntime(thirdTab, 'runtime-disposed')
    await expect
      .poll(() => listedRuntimeIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-moved', 'runtime-live'])

    await closeTab(server, firstTab)
    await settle()
    expect(await listedRuntimeIds(session)).toStrictEqual([
      'runtime-moved',
      'runtime-live',
    ])

    await closeTab(server, secondTab)
    await expect
      .poll(() => listedRuntimeIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-live'])

    await closeTab(server, thirdTab)
    await expect
      .poll(() => listedRuntimeIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual([])
    expect(
      loggedLinesContaining('runtime pruned (socket close)'),
    ).toStrictEqual([
      '[foldkit:devTools] runtime pruned (socket close): runtime-moved',
      '[foldkit:devTools] runtime pruned (socket close): runtime-live',
    ])
  },
  TEST_TIMEOUT,
)

it(
  'forgets an MCP client that disconnects',
  async () => {
    const { record } = await startServer()
    const session = await openWebSocket(record.url)

    session.close()

    await expect
      .poll(() => loggedLinesContaining('MCP client disconnected'), {
        timeout: POLL_TIMEOUT,
      })
      .toStrictEqual([
        '[foldkit:devTools] MCP client disconnected (0 remaining)',
      ])
  },
  TEST_TIMEOUT,
)

it(
  'watches a socket for its close once, however many DevTools frames it sends',
  async () => {
    const { server, record } = await startServer()
    const session = await openWebSocket(record.url)
    const tab = await openTab(server)
    await expect
      .poll(() => server.ws.clients.size, { timeout: POLL_TIMEOUT })
      .toBe(1)
    const { socket } = Option.getOrThrowWith(
      Array.head(Array.fromIterable(server.ws.clients)),
      () => new Error('The dev server has no HMR client'),
    )
    const closeListenersBefore = socket.listenerCount('close')
    const connectionIds = Array.makeBy(FRAME_BURST, index => `runtime-${index}`)

    for (const connectionId of connectionIds) {
      announceRuntime(tab, connectionId)
    }

    await expect
      .poll(() => listedRuntimeIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(connectionIds)
    expect(socket.listenerCount('close')).toBe(closeListenersBefore + 1)
  },
  TEST_TIMEOUT,
)

it(
  'answers only the requester when a request names a Runtime the relay does not list',
  async () => {
    const { server, record } = await startServer()
    const tab = await openTab(server)
    const requestingSession = await openWebSocket(record.url)
    const otherSession = await openWebSocket(record.url)
    announceRuntime(tab, 'runtime-listed')
    await expect
      .poll(() => listedRuntimeIds(requestingSession), {
        timeout: POLL_TIMEOUT,
      })
      .toStrictEqual(['runtime-listed'])
    const requestsToTab = receivedRequestFrames(tab)
    const framesToRequester = receivedFrames(requestingSession)
    const framesToOtherSession = receivedFrames(otherSession)

    requestingSession.send(
      JSON.stringify({
        id: 'request-unknown',
        maybeConnectionId: 'runtime-unknown',
        request: { _tag: 'RequestResume' },
      }),
    )

    await expect
      .poll(() => framesToRequester, {
        timeout: UNKNOWN_RUNTIME_FAILURE_BUDGET,
      })
      .toStrictEqual([
        {
          id: 'request-unknown',
          response: {
            _tag: 'ResponseError',
            reason:
              'No connected Foldkit Runtime has the id runtime-unknown. Call foldkit_list_runtimes for the current ids.',
          },
        },
      ])
    await settle()
    expect(framesToOtherSession).toStrictEqual([])
    expect(requestsToTab).toStrictEqual([])
  },
  TEST_TIMEOUT,
)
