import { createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'
import type { WebSocket } from 'ws'

import { foldkit } from '../src/index.ts'
import {
  findFreePort,
  isPortAccepting,
  openWebSocket,
  serverPort,
  useRelayRegistry,
} from './relayFixtures.ts'

const RUNTIME_COUNT = 10
const TEST_TIMEOUT = 20_000

const directories = useRelayRegistry()

const startServer = async () => {
  const relayPort = await findFreePort()
  const server = await createServer({
    root: directories.root,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [foldkit({ devToolsMcpPort: relayPort })],
  })
  onTestFinished(() => server.close().catch(() => undefined))
  await server.listen()
  await expect.poll(() => isPortAccepting(relayPort)).toBe(true)
  const browser = await openWebSocket(
    `ws://127.0.0.1:${serverPort(server)}`,
    'vite-hmr',
  )
  const session = await openWebSocket(`ws://127.0.0.1:${relayPort}`)
  return { browser, session }
}

const announce = (browser: WebSocket, connectionId: string) =>
  browser.send(
    JSON.stringify({
      type: 'custom',
      event: 'foldkit:devTools:event',
      data: {
        maybeConnectionId: connectionId,
        event: {
          _tag: 'EventConnected',
          runtime: { connectionId, url: 'http://app/', title: connectionId },
        },
      },
    }),
  )

const listedIds = (session: WebSocket) =>
  new Promise<Array<string>>(resolveListed => {
    session.once('message', raw =>
      resolveListed(
        JSON.parse(raw.toString()).response.runtimes.map(
          (runtime: { connectionId: string }) => runtime.connectionId,
        ),
      ),
    )
    session.send(
      JSON.stringify({
        id: 'list',
        maybeConnectionId: null,
        request: { _tag: 'RequestListRuntimes' },
      }),
    )
  })

it(
  'lists Runtimes in the order they connected',
  async () => {
    const { browser, session } = await startServer()
    const connectionIds = Array.from(
      { length: RUNTIME_COUNT },
      (_, index) => `runtime-${index}`,
    )

    for (const connectionId of connectionIds) {
      announce(browser, connectionId)
    }

    await expect
      .poll(async () => (await listedIds(session)).length)
      .toBe(RUNTIME_COUNT)
    expect(await listedIds(session)).toStrictEqual(connectionIds)
  },
  TEST_TIMEOUT,
)

it(
  'lists a Runtime that announces again last, once',
  async () => {
    const { browser, session } = await startServer()

    announce(browser, 'runtime-first')
    announce(browser, 'runtime-second')
    announce(browser, 'runtime-third')
    announce(browser, 'runtime-first')

    await expect
      .poll(() => listedIds(session))
      .toStrictEqual(['runtime-second', 'runtime-third', 'runtime-first'])
  },
  TEST_TIMEOUT,
)
