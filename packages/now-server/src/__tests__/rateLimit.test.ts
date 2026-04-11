import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeRateLimiter } from '../auth/rateLimit.js'

describe('rate limiter', () => {
  it('allows requests up to the limit', async () => {
    const limiter = await Effect.runPromise(makeRateLimiter(3, 60))
    const results = await Promise.all([
      Effect.runPromise(limiter.check('a')),
      Effect.runPromise(limiter.check('a')),
      Effect.runPromise(limiter.check('a')),
    ])
    results.forEach(result => {
      expect(result._tag).toBe('Allowed')
    })
  })

  it('denies requests once the limit is exceeded', async () => {
    const limiter = await Effect.runPromise(makeRateLimiter(2, 60))
    await Effect.runPromise(limiter.check('a'))
    await Effect.runPromise(limiter.check('a'))
    const denied = await Effect.runPromise(limiter.check('a'))
    expect(denied._tag).toBe('Denied')
    if (denied._tag === 'Denied') {
      expect(denied.retryAfterSeconds).toBeGreaterThan(0)
    }
  })

  it('tracks buckets per key independently', async () => {
    const limiter = await Effect.runPromise(makeRateLimiter(1, 60))
    const firstA = await Effect.runPromise(limiter.check('a'))
    const firstB = await Effect.runPromise(limiter.check('b'))
    const secondA = await Effect.runPromise(limiter.check('a'))
    expect(firstA._tag).toBe('Allowed')
    expect(firstB._tag).toBe('Allowed')
    expect(secondA._tag).toBe('Denied')
  })
})
