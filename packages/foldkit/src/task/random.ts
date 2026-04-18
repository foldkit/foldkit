import { Effect } from 'effect'

/**
 * Generates a random integer between min (inclusive) and max (exclusive).
 *
 * @example
 * ```typescript
 * Task.randomInt(1, 7).pipe(Effect.map(value => GotDiceRoll({ value })))
 * ```
 */
export const randomInt = (min: number, max: number): Effect.Effect<number> =>
  Effect.sync(() => Math.floor(Math.random() * (max - min)) + min)

/**
 * Generates a RFC 4122 version 4 UUID via the platform's
 * `crypto.randomUUID()`.
 *
 * @example
 * ```typescript
 * Task.uuid.pipe(Effect.map(id => CreatedCard({ id, title })))
 * ```
 */
export const uuid: Effect.Effect<string> = Effect.sync(() =>
  crypto.randomUUID(),
)
