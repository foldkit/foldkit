import { Cause, Effect, Logger, Runtime } from 'effect'
import { describe, expect, it } from 'vitest'

import { __reportUnhandledCause } from './runtime.js'

const runWithCollectingLogger = async (
  effect: Effect.Effect<void>,
): Promise<ReadonlyArray<Cause.Cause<unknown>>> => {
  const loggedCauses: Array<Cause.Cause<unknown>> = []
  const logger = Logger.make(options => {
    loggedCauses.push(options.cause)
  })

  await Effect.runPromise(effect.pipe(Effect.provide(Logger.layer([logger]))))

  return loggedCauses
}

const FLAGS_STARTUP_FAILURE = 'flags blew up on embed startup'

describe('__reportUnhandledCause', () => {
  it('logs an unreported defect Cause', async () => {
    const cause = Cause.die(new Error(FLAGS_STARTUP_FAILURE))

    const loggedCauses = await runWithCollectingLogger(
      __reportUnhandledCause(cause),
    )

    expect(loggedCauses).toHaveLength(1)
    expect(Cause.pretty(loggedCauses[0]!)).toContain(FLAGS_STARTUP_FAILURE)
  })

  it('stays quiet for interrupt-only Causes', async () => {
    const loggedCauses = await runWithCollectingLogger(
      __reportUnhandledCause(Cause.interrupt()),
    )

    expect(loggedCauses).toEqual([])
  })

  it('stays quiet when the squashed error is marked already reported', async () => {
    const cause = Cause.die(
      Object.assign(new Error('already reported flags failure'), {
        [Runtime.errorReported]: false,
      }),
    )

    const loggedCauses = await runWithCollectingLogger(
      __reportUnhandledCause(cause),
    )

    expect(loggedCauses).toEqual([])
  })
})
