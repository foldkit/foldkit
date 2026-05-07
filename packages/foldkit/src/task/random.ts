import { Effect, Random } from 'effect'

/**
 * Generates a random integer between min (inclusive) and max (exclusive)
 * via Effect's `Random` service. Seedable in tests with `Random.withSeed`.
 *
 * @example
 * ```typescript
 * Task.randomInt(1, 7).pipe(Effect.map(value => GotDiceRoll({ value })))
 * ```
 */
export const randomInt = (min: number, max: number): Effect.Effect<number> =>
  Random.nextIntBetween(min, max, { halfOpen: true })

/**
 * Generates a RFC 4122 version 4 UUID via Effect's `Random` service.
 * Seedable in tests with `Random.withSeed`.
 *
 * @example
 * ```typescript
 * Task.uuid.pipe(Effect.map(id => CreatedCard({ id, title })))
 * ```
 */
export const uuid: Effect.Effect<string> = Random.nextUUIDv4
