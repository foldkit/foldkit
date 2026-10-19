import { connect } from 'node:net'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

import { foldkit } from '../src/index.ts'
import {
  serverPort,
  useRelayRegistry,
  waitUntilPublished,
} from './relayFixtures.ts'

const directories = useRelayRegistry()

const sendMalformedUpgrade = (port: number): Promise<string> =>
  new Promise((resolveClosed, rejectClosed) => {
    const socket = connect({ port, host: '127.0.0.1' })
    const chunks: Array<string> = []
    socket.on('data', chunk => chunks.push(chunk.toString()))
    socket.on('close', () => resolveClosed(chunks.join('')))
    socket.on('error', error => {
      if (!('code' in error && error.code === 'ECONNRESET')) {
        rejectClosed(error)
      }
    })
    socket.on('connect', () => {
      socket.write(
        'GET http://[ HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
      )
    })
  })

it('keeps the dev server running after a malformed upgrade to the relay', async () => {
  const server = await createServer({
    root: directories.root,
    configFile: false,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [foldkit()],
  })

  try {
    await server.listen()
    const record = await waitUntilPublished(directories.root)

    expect(
      await sendMalformedUpgrade(Number(new URL(record.url).port)),
    ).toMatch(/^HTTP\/1\.1 400 Bad Request\r\n/)

    const response = await fetch(
      `http://127.0.0.1:${serverPort(server)}/@vite/client`,
    )
    expect(response.status).toBe(200)
    await response.arrayBuffer()
  } finally {
    await server.close()
  }
}, 20_000)
