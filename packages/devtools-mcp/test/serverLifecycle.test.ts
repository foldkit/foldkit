import { Option, Schema } from 'effect'
import { RequestFrame } from 'foldkit/devtools-protocol'
import { resolve } from 'node:path'
import { expect, it, onTestFinished } from 'vitest'
import { type RawData, WebSocketServer } from 'ws'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

import { boundPort } from './boundPort.ts'

const TEST_TIMEOUT = 30_000
const CANCELLATION_SETTLE_DELAY = 500
const CANCELED_RUNTIME_ID = 'runtime-canceled-call'
const LATER_RUNTIME_ID = 'runtime-later-call'
const SERVER_PATH = resolve(import.meta.dirname, '../dist/server.js')

type ApproveHandshake = (
  accepted: boolean,
  code?: number,
  message?: string,
) => void

const closeRelay = (relay: WebSocketServer): Promise<void> =>
  new Promise((resolveClose, reject) => {
    for (const socket of relay.clients) {
      socket.terminate()
    }

    relay.close(error => {
      if (error) {
        reject(error)
      } else {
        resolveClose()
      }
    })
  })

it(
  'cancels a stdio tool call without sending its Runtime request or closing the shared relay client',
  async () => {
    const handshake: {
      approve?: ApproveHandshake
      isAnswered: boolean
      resolveRequested?: () => void
    } = { isAnswered: false }
    const handshakeRequested = new Promise<void>(resolveRequested => {
      handshake.resolveRequested = resolveRequested
    })
    const resumeRuntimeIds: Array<string> = []
    const connections = { count: 0 }
    const socketClose: { resolve?: () => void } = {}
    const relaySocketClosed = new Promise<void>(resolveClosed => {
      socketClose.resolve = resolveClosed
    })
    const relay = new WebSocketServer({
      host: '127.0.0.1',
      port: 0,
      verifyClient: (_info, approve) => {
        handshake.approve = approve
        handshake.resolveRequested?.()
      },
    })

    relay.on('connection', socket => {
      connections.count += 1
      socket.once('close', () => socketClose.resolve?.())
      socket.on('message', (raw: RawData) => {
        const frame = Schema.decodeUnknownSync(RequestFrame)(
          JSON.parse(raw.toString()),
        )

        if (frame.request._tag === 'RequestListRuntimes') {
          socket.send(
            JSON.stringify({
              id: frame.id,
              response: {
                _tag: 'ResponseRuntimes',
                runtimes: [
                  {
                    connectionId: CANCELED_RUNTIME_ID,
                    url: 'http://canceled-call/',
                    title: CANCELED_RUNTIME_ID,
                  },
                  {
                    connectionId: LATER_RUNTIME_ID,
                    url: 'http://later-call/',
                    title: LATER_RUNTIME_ID,
                  },
                ],
              },
            }),
          )
        } else if (frame.request._tag === 'RequestResume') {
          resumeRuntimeIds.push(
            Option.getOrThrowWith(
              frame.maybeConnectionId,
              () => new Error('resume request has no Runtime id'),
            ),
          )
          socket.send(
            JSON.stringify({
              id: frame.id,
              response: { _tag: 'ResponseResumed' },
            }),
          )
        }
      })
    })

    const answerHandshake = (accepted: boolean): void => {
      if (handshake.isAnswered) {
        return
      }

      handshake.isAnswered = true
      handshake.approve?.(accepted)
    }

    const listening = new Promise<void>(resolveListening => {
      relay.once('listening', () => resolveListening())
    })
    const client = new Client({
      name: '@foldkit/devtools-mcp-lifecycle-test',
      version: '0.1.0',
    })

    onTestFinished(async () => {
      answerHandshake(false)
      await client.close().catch(() => undefined)
      await closeRelay(relay)
    })

    await listening
    const port = Option.getOrThrowWith(
      boundPort(relay.address()),
      () => new Error('relay has no port'),
    )

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [SERVER_PATH],
      cwd: resolve(import.meta.dirname, '..'),
      env: {
        FOLDKIT_DEVTOOLS_MCP_HOST: '127.0.0.1',
        FOLDKIT_DEVTOOLS_MCP_PORT: globalThis.String(port),
      },
      stderr: 'pipe',
    })
    await client.connect(transport)

    const controller = new AbortController()
    const canceledCall = client.callTool(
      {
        name: 'foldkit_resume',
        arguments: { runtime_id: CANCELED_RUNTIME_ID },
      },
      undefined,
      { signal: controller.signal },
    )

    await handshakeRequested
    controller.abort()
    await expect(canceledCall).rejects.toThrow()
    await client.ping()

    answerHandshake(true)
    await new Promise(resolveDelay =>
      setTimeout(resolveDelay, CANCELLATION_SETTLE_DELAY),
    )

    const laterResult = await client.callTool({
      name: 'foldkit_resume',
      arguments: { runtime_id: LATER_RUNTIME_ID },
    })

    expect(JSON.stringify(laterResult)).toContain('ResponseResumed')
    expect(resumeRuntimeIds).toStrictEqual([LATER_RUNTIME_ID])
    expect(connections.count).toBe(1)

    await client.close()

    await relaySocketClosed
  },
  TEST_TIMEOUT,
)
