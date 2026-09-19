import { mkdtemp, rm } from 'node:fs/promises'
import { connect } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

import { foldkit } from '../src/index.ts'

const sendMalformedUpgrade = (port: number): Promise<void> =>
  new Promise((resolveClosed, rejectClosed) => {
    const socket = connect({ port, host: '127.0.0.1' })
    socket.on('close', resolveClosed)
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

it('keeps the dev server running after a malformed WebSocket upgrade', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foldkit-malformed-upgrade-'))
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0 },
    plugins: [foldkit()],
  })

  try {
    await server.listen()
    const address = server.httpServer?.address()
    if (
      address === undefined ||
      address === null ||
      typeof address === 'string'
    ) {
      throw new Error('The dev server has no bound port')
    }

    await sendMalformedUpgrade(address.port)

    const response = await fetch(
      `http://127.0.0.1:${address.port}/@vite/client`,
    )
    expect(response.status).toBe(200)
    await response.arrayBuffer()
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
}, 20_000)
