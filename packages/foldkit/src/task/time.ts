import { DateTime, Effect, Option } from 'effect'

import { TimeZoneError } from './error.js'

/**
 * Gets the current UTC time.
 *
 * @example
 * ```typescript
 * Task.getTime.pipe(Effect.map(utc => GotTime({ utc })))
 * ```
 */
export const getTime: Effect.Effect<DateTime.Utc> = DateTime.now

/**
 * Gets the system timezone.
 *
 * @example
 * ```typescript
 * Task.getTimeZone.pipe(Effect.map(zone => GotTimeZone({ zone })))
 * ```
 */
export const getTimeZone: Effect.Effect<DateTime.TimeZone> = Effect.sync(() =>
  DateTime.zoneMakeLocal(),
)

/**
 * Gets the current time in the system timezone.
 *
 * @example
 * ```typescript
 * Task.getZonedTime.pipe(Effect.map(zoned => GotTime({ zoned })))
 * ```
 */
export const getZonedTime: Effect.Effect<DateTime.Zoned> = Effect.gen(
  function* () {
    const utc = yield* DateTime.now
    const zone = DateTime.zoneMakeLocal()
    return DateTime.setZone(utc, zone)
  },
)

/**
 * Gets the current time in a specific timezone.
 * Fails with `TimeZoneError` if the timezone ID is invalid.
 *
 * @example
 * ```typescript
 * Task.getZonedTimeIn('America/New_York').pipe(
 *   Effect.map(zoned => GotNYTime({ zoned })),
 *   Effect.catchAll(() => Effect.succeed(FailedGetTimeZone())),
 * )
 * ```
 */
export const getZonedTimeIn = (
  zoneId: string,
): Effect.Effect<DateTime.Zoned, TimeZoneError> =>
  Effect.gen(function* () {
    const utc = yield* DateTime.now
    const maybeZone = DateTime.zoneMakeNamed(zoneId)
    if (Option.isNone(maybeZone)) {
      return yield* Effect.fail(new TimeZoneError({ zoneId }))
    }
    return DateTime.setZone(utc, maybeZone.value)
  })
