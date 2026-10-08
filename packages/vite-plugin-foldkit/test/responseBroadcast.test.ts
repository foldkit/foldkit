import { Array, Order } from 'effect'
import { createServer } from 'vite'
import { expect, it, onTestFinished } from 'vitest'

import { foldkit } from '../src/index.ts'
import {
  openWebSocket,
  serverPort,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const SETTLE = 300
const TEST_TIMEOUT = 20_000

const directories = useRelayRegistry()

it(
  'sends a Runtime response to every MCP client and a list response to the requester',
  async () => {
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
    browser.on('message', raw => {
      const payload = JSON.parse(raw.toString())
      if (payload.event === 'foldkit:devTools:request') {
        browser.send(
          JSON.stringify({
            type: 'custom',
            event: 'foldkit:devTools:response',
            data: {
              id: payload.data.id,
              response: { _tag: 'ResponseResumed' },
            },
          }),
        )
      }
    })

    const firstSession = await openWebSocket(record.url)
    const secondSession = await openWebSocket(record.url)
    const seenByFirst: Array<string> = []
    const seenBySecond: Array<string> = []
    firstSession.on('message', raw =>
      seenByFirst.push(JSON.parse(raw.toString()).id),
    )
    secondSession.on('message', raw =>
      seenBySecond.push(JSON.parse(raw.toString()).id),
    )

    firstSession.send(
      JSON.stringify({
        id: 'resume-from-first',
        maybeConnectionId: 'tab',
        request: { _tag: 'RequestResume' },
      }),
    )
    firstSession.send(
      JSON.stringify({
        id: 'list-from-first',
        maybeConnectionId: null,
        request: { _tag: 'RequestListRuntimes' },
      }),
    )
    await new Promise(done => setTimeout(done, SETTLE))

    expect(Array.sort(seenByFirst, Order.String)).toStrictEqual([
      'list-from-first',
      'resume-from-first',
    ])
    expect(seenBySecond).toStrictEqual(['resume-from-first'])
  },
  TEST_TIMEOUT,
)
