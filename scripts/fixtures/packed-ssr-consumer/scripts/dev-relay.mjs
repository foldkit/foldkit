import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { createServer } from 'vite'

import { foldkit } from '@foldkit/vite-plugin'

const registry = await mkdtemp(join(tmpdir(), 'foldkit-packed-relay-'))
const previousDirectory = process.env.FOLDKIT_DEVTOOLS_RELAY_DIRECTORY
process.env.FOLDKIT_DEVTOOLS_RELAY_DIRECTORY = registry
const timeoutMillis = 10_000
let server
let socket

try {
  server = await createServer({
    configFile: false,
    root: process.cwd(),
    logLevel: 'silent',
    plugins: [foldkit()],
    server: { host: '127.0.0.1', port: 0 },
    optimizeDeps: { noDiscovery: true },
  })
  await server.listen()

  const deadline = Date.now() + timeoutMillis
  let record
  while (record === undefined && Date.now() < deadline) {
    const filename = (await readdir(registry)).find(name =>
      name.endsWith('.json'),
    )
    if (filename === undefined) {
      await setTimeout(20)
    } else {
      record = JSON.parse(await readFile(join(registry, filename), 'utf8'))
    }
  }
  assert.ok(record, 'Installed Vite plugin did not publish a live MCP relay')
  assert.match(
    record.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )

  socket = new WebSocket(record.url)
  await new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(
      () => reject(new Error('Relay connection timed out')),
      timeoutMillis,
    )
    socket.addEventListener(
      'open',
      () => {
        globalThis.clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
    socket.addEventListener(
      'error',
      error => {
        globalThis.clearTimeout(timer)
        reject(error)
      },
      { once: true },
    )
  })

  const response = new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(
      () => reject(new Error('Relay response timed out')),
      timeoutMillis,
    )
    socket.addEventListener(
      'message',
      event => {
        globalThis.clearTimeout(timer)
        resolve(JSON.parse(event.data))
      },
      { once: true },
    )
  })
  socket.send(
    JSON.stringify({
      id: 'packed-relay-probe',
      maybeConnectionId: null,
      request: { _tag: 'RequestListRuntimes' },
    }),
  )
  const frame = await response
  assert.equal(frame.id, 'packed-relay-probe')
  assert.deepEqual(frame.response.runtimes, [])
  console.log(
    'Installed Vite plugin starts its Crypto-backed relay and answers a request',
  )
} finally {
  socket?.close()
  await server?.close()
  if (previousDirectory === undefined) {
    delete process.env.FOLDKIT_DEVTOOLS_RELAY_DIRECTORY
  } else {
    process.env.FOLDKIT_DEVTOOLS_RELAY_DIRECTORY = previousDirectory
  }
  await rm(registry, { recursive: true, force: true })
}
