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
  // eslint-disable-next-line no-restricted-syntax
  Effect.sync(() => Math.floor(Math.random() * (max - min)) + min)
