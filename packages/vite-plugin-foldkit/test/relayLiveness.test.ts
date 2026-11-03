import { Effect, Option } from 'effect'
import type { RelayRecord } from 'foldkit/devtools-protocol'
import { describe, expect, it } from 'vitest'

import { checkRelay } from '../src/relayLiveness.ts'

const DEAD_PID = 2_147_483_647

describe('checkRelay', () => {
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
})
