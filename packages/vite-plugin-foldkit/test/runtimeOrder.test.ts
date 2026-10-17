import { createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'

import { foldkit } from '../src/index.ts'
import {
  POLL_TIMEOUT,
  announceRuntime,
  listedRuntimeIds,
  openWebSocket,
  serverPort,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const RUNTIME_COUNT = 10
const TEST_TIMEOUT = 20_000

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
  const browser = await openWebSocket(
    `ws://127.0.0.1:${serverPort(server)}`,
    'vite-hmr',
  )
  const session = await openWebSocket(record.url)

  return { browser, session }
}

it(
  'lists Runtimes in the order they connected',
  async () => {
    const { browser, session } = await startServer()
    const connectionIds = Array.from(
      { length: RUNTIME_COUNT },
      (_, index) => `runtime-${index}`,
    )

    for (const connectionId of connectionIds) {
      announceRuntime(browser, connectionId)
    }

    await expect
      .poll(async () => (await listedRuntimeIds(session)).length, {
        timeout: POLL_TIMEOUT,
      })
      .toBe(RUNTIME_COUNT)
    expect(await listedRuntimeIds(session)).toStrictEqual(connectionIds)
  },
  TEST_TIMEOUT,
)

it(
  'lists a Runtime that announces again last, once',
  async () => {
    const { browser, session } = await startServer()

    announceRuntime(browser, 'runtime-first')
    announceRuntime(browser, 'runtime-second')
    announceRuntime(browser, 'runtime-third')
    announceRuntime(browser, 'runtime-first')

    await expect
      .poll(() => listedRuntimeIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-second', 'runtime-third', 'runtime-first'])
  },
  TEST_TIMEOUT,
)
