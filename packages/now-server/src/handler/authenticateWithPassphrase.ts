import { Rpc } from '@effect/rpc'
import {
  AuthenticationFailedError,
  RecoveryDisabledError,
  type SessionIssue,
  SessionToken,
  type authenticateWithPassphraseRpc,
} from '@foldkit/now-shared'
import { Effect, Option } from 'effect'

import { verifyPassphrase } from '../auth/passphrase.js'
import { issueSessionToken } from '../auth/session.js'
import { type AppConfigShape } from '../config.js'

const MIN_PASSPHRASE_LENGTH = 16
const MIN_VERIFY_DELAY_MILLIS = 500

export type AuthenticateWithPassphraseDeps = Readonly<{
  config: AppConfigShape
}>

export const authenticateWithPassphrase =
  (deps: AuthenticateWithPassphraseDeps) =>
  (
    payload: Rpc.Payload<typeof authenticateWithPassphraseRpc>,
  ): Effect.Effect<
    SessionIssue,
    AuthenticationFailedError | RecoveryDisabledError
  > =>
    Effect.gen(function* () {
      if (!deps.config.recoveryPassphraseEnabled) {
        yield* Effect.logWarning('recovery_disabled_attempt')
        return yield* Effect.fail(
          new RecoveryDisabledError({
            message: 'recovery passphrase is disabled',
          }),
        )
      }

      const verifyResult = yield* Option.match(deps.config.maybePassphraseHash, {
        onNone: () => Effect.succeed(false),
        onSome: hash =>
          payload.passphrase.length < MIN_PASSPHRASE_LENGTH
            ? Effect.succeed(false)
            : verifyPassphrase(payload.passphrase, hash),
      })

      // Ensure a minimum response time so attackers can't distinguish
      // "not configured" / "bad passphrase" / "short passphrase" by timing.
      yield* Effect.sleep(`${MIN_VERIFY_DELAY_MILLIS} millis`)

      if (!verifyResult) {
        yield* Effect.logWarning('passphrase_invalid')
        return yield* Effect.fail(
          new AuthenticationFailedError({ reason: 'invalid passphrase' }),
        )
      }

      const issued = yield* issueSessionToken(
        'admin',
        deps.config.sessionSecret,
        deps.config.sessionTtlSeconds,
      )

      yield* Effect.logWarning('login_success_passphrase')

      return {
        sessionToken: SessionToken.make(issued.token),
        expiresAt: issued.expiresAtMillis,
      }
    })
