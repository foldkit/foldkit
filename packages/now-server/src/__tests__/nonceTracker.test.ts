import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeNonceTracker } from '../auth/nonceTracker.js'

describe('nonce tracker', () => {
  it('accepts a fresh nonce', async () => {
    const tracker = await Effect.runPromise(makeNonceTracker(120))
    const accepted = await Effect.runPromise(tracker.registerNonce('n1'))
    expect(accepted).toBe(true)
  })

  it('rejects a replayed nonce', async () => {
    const tracker = await Effect.runPromise(makeNonceTracker(120))
    await Effect.runPromise(tracker.registerNonce('n1'))
    const second = await Effect.runPromise(tracker.registerNonce('n1'))
    expect(second).toBe(false)
  })

  it('tracks distinct nonces independently', async () => {
    const tracker = await Effect.runPromise(makeNonceTracker(120))
    const a = await Effect.runPromise(tracker.registerNonce('nA'))
    const b = await Effect.runPromise(tracker.registerNonce('nB'))
    const cReplay = await Effect.runPromise(tracker.registerNonce('nA'))
    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(cReplay).toBe(false)
  })
})
