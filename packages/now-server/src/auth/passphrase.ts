import { verify } from '@node-rs/argon2'
import { Effect, Redacted } from 'effect'

export const verifyPassphrase = (
  passphrase: string,
  hash: Redacted.Redacted<string>,
): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: () => verify(Redacted.value(hash), passphrase),
    catch: () => new Error('argon2 verify failed'),
  }).pipe(Effect.catchAll(() => Effect.succeed(false)))
