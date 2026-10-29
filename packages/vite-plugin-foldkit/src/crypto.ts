import { Effect, Predicate } from 'effect'
import type * as PlatformError from 'effect/PlatformError'

type RandomUUIDv4Crypto = Readonly<{
  randomUUIDv4:
    | Effect.Effect<string, PlatformError.PlatformError>
    | (() => Effect.Effect<string, PlatformError.PlatformError>)
}>

/** Normalizes Effect Crypto's property and method forms of randomUUIDv4. */
export const randomUUIDv4Effect = (
  crypto: RandomUUIDv4Crypto,
): Effect.Effect<string, PlatformError.PlatformError> =>
  Effect.suspend(() => {
    const operation = crypto.randomUUIDv4

    if (Predicate.isFunction(operation)) {
      return operation.call(crypto)
    }

    return operation
  })
