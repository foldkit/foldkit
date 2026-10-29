import { Effect, PlatformError } from 'effect'
import { describe, expect, it } from 'vitest'

import { randomUUIDv4Effect } from '../src/crypto.ts'

describe('randomUUIDv4Effect', () => {
  it('runs a property Effect only when the returned Effect is executed', async () => {
    let executionCount = 0
    const effect = randomUUIDv4Effect({
      randomUUIDv4: Effect.sync(() => {
        executionCount += 1
        return 'property-uuid'
      }),
    })

    expect(executionCount).toBe(0)
    await expect(Effect.runPromise(effect)).resolves.toBe('property-uuid')
    expect(executionCount).toBe(1)
  })

  it('defers method invocation and preserves its receiver', async () => {
    const crypto = {
      value: 'method-uuid',
      invocationCount: 0,
      randomUUIDv4() {
        this.invocationCount += 1
        return Effect.sync(() => this.value)
      },
    }
    const effect = randomUUIDv4Effect(crypto)

    expect(crypto.invocationCount).toBe(0)
    await expect(Effect.runPromise(effect)).resolves.toBe('method-uuid')
    expect(crypto.invocationCount).toBe(1)
  })

  it('preserves a property Effect failure', async () => {
    const failure = PlatformError.systemError({
      _tag: 'Unknown',
      module: 'Crypto',
      method: 'randomUUIDv4',
    })
    const result = await Effect.runPromise(
      Effect.match(randomUUIDv4Effect({ randomUUIDv4: Effect.fail(failure) }), {
        onFailure: error => ({ failure: error }),
        onSuccess: () => ({ success: true }),
      }),
    )

    expect('failure' in result).toBe(true)

    if ('failure' in result) {
      expect(result.failure).toBe(failure)
    }
  })
})
