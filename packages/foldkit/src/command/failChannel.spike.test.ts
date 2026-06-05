import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { m } from '../message/index.js'
import {
  type FallibleCommand,
  defineFallible,
  runCommandToMessage,
} from './failChannel.spike.js'

// MESSAGE

const SucceededFetchWeather = m('SucceededFetchWeather', { tempF: S.Number })
const WeatherNotFound = m('WeatherNotFound', { zipCode: S.String })
const WeatherRateLimited = m('WeatherRateLimited', { retryAfterMs: S.Number })

// COMMAND

// The call site: a fallible Command that `Effect.fail`s declared error
// Messages instead of catching and re-succeeding. The result Message union
// reaching `update` is SucceededFetchWeather | WeatherNotFound | WeatherRateLimited.
const FetchWeather = defineFallible(
  'FetchWeather',
  { zipCode: S.String },
  {
    success: SucceededFetchWeather,
    errors: [WeatherNotFound, WeatherRateLimited],
  },
)(({ zipCode }) =>
  Effect.gen(function* () {
    if (zipCode === '00000') {
      return yield* Effect.fail(WeatherNotFound({ zipCode }))
    }
    if (zipCode === '99999') {
      return yield* Effect.fail(WeatherRateLimited({ retryAfterMs: 1000 }))
    }
    return SucceededFetchWeather({ tempF: 72 })
  }),
)

describe('error channel as Messages (spike)', () => {
  it('routes a success to the success Message', async () => {
    const message = await Effect.runPromise(
      runCommandToMessage(FetchWeather({ zipCode: '90210' })),
    )
    expect(message).toEqual(SucceededFetchWeather({ tempF: 72 }))
  })

  it('routes a declared Effect.fail to its error Message', async () => {
    const notFound = await Effect.runPromise(
      runCommandToMessage(FetchWeather({ zipCode: '00000' })),
    )
    expect(notFound).toEqual(WeatherNotFound({ zipCode: '00000' }))

    const rateLimited = await Effect.runPromise(
      runCommandToMessage(FetchWeather({ zipCode: '99999' })),
    )
    expect(rateLimited).toEqual(WeatherRateLimited({ retryAfterMs: 1000 }))
  })

  it('treats an undeclared failure as a defect (would hit crashWith)', async () => {
    // Simulates an `any`-typed leak: a failure whose tag is not in the
    // declared error set. The type system forbids this at a real call site;
    // the runtime guard is the belt-and-suspenders boundary.
    const leakyCommand: FallibleCommand<never, { _tag: string }> = {
      name: 'FetchWeather',
      effect: Effect.fail({ _tag: 'WeatherExploded' }),
      declaredErrorTags: new Set(['WeatherNotFound', 'WeatherRateLimited']),
    }

    const exit = await Effect.runPromiseExit(runCommandToMessage(leakyCommand))
    expect(Exit.isFailure(exit)).toBe(true)
  })
})
