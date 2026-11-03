import { Effect, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { createServer } from 'node:net'
import { describe, expect, it, onTestFinished } from 'vitest'

import { checkRelay } from '../src/relayLiveness.ts'
import { boundPort } from './boundPort.ts'

const DEAD_PID = 2_147_483_647

describe('checkRelay', () => {
  it('marks a relay from another network namespace unreachable when the PID namespace matches', async () => {
    const record: RelayRecord = {
      version: 1,
      id: 'unreachable',
      root: '/workspace/app',
      url: 'ws://127.0.0.1:1/__foldkit/devtools-mcp',
      pid: process.pid,
      startedAt: 1,
      namespaces: { pid: 'pid:[same]', network: 'net:[other]' },
    }

    const status = await Effect.runPromise(
      checkRelay(
        record,
        Option.some({ pid: 'pid:[same]', network: 'net:[current]' }),
      ),
    )

    expect(status).toBe('Unreachable')
  })

  it('keeps a namespaced relay when the reader cannot inspect its own namespaces', async () => {
    const record: RelayRecord = {
      version: 1,
      id: 'unknown-own-namespaces',
      root: '/workspace/app',
      url: 'ws://127.0.0.1:1/__foldkit/devtools-mcp',
      pid: DEAD_PID,
      startedAt: 1,
      namespaces: { pid: 'pid:[other]', network: 'net:[other]' },
    }

    const status = await Effect.runPromise(checkRelay(record, Option.none()))

    expect(status).toBe('Unreachable')
  })

  it.skipIf(process.platform !== 'linux')(
    'probes a legacy record when the reader cannot read its own namespaces',
    async () => {
      const server = createServer()
      onTestFinished(
        () => new Promise<void>(done => server.close(() => done())),
      )
      await new Promise<void>((resolveListening, reject) => {
        server.on('error', reject)
        server.listen(0, '127.0.0.1', () => resolveListening())
      })
      const port = Option.getOrThrowWith(
        boundPort(server.address()),
        () => new Error('The server has no bound port'),
      )
      const record: RelayRecord = {
        version: 1,
        id: 'legacy',
        root: '/workspace/app',
        url: `ws://127.0.0.1:${port}/__foldkit/devtools-mcp`,
        pid: DEAD_PID,
        startedAt: 1,
      }

      const status = await Effect.runPromise(checkRelay(record, Option.none()))

      expect(status).toBe('Running')
    },
  )
})
