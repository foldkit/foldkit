import { Rpc } from '@effect/rpc'
import {
  AuthenticationFailedError,
  type SessionIssue,
  SessionToken,
  type finishAuthenticationRpc,
} from '@foldkit/now-shared'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { Effect, HashMap, Option, Ref } from 'effect'

import { issueSessionToken } from '../auth/session.js'
import {
  filterKnownTransports,
  toAuthenticationResponseJSON,
} from '../auth/webauthnTypes.js'
import { type AppConfigShape } from '../config.js'
import type { ChallengeRecord, PasskeyStoreService } from '../store.js'

const CHALLENGE_MAX_AGE_MILLIS = 2 * 60 * 1000

export type FinishAuthenticationDeps = Readonly<{
  config: AppConfigShape
  challengesRef: Ref.Ref<HashMap.HashMap<string, ChallengeRecord>>
  passkeyStore: PasskeyStoreService
}>

export const finishAuthentication =
  (deps: FinishAuthenticationDeps) =>
  (
    payload: Rpc.Payload<typeof finishAuthenticationRpc>,
  ): Effect.Effect<SessionIssue, AuthenticationFailedError> =>
    Effect.gen(function* () {
      const registeredPasskeys = yield* deps.passkeyStore.list()

      const maybePasskey = Option.fromNullable(
        registeredPasskeys.find(
          passkey => passkey.credentialId === payload.response.id,
        ),
      )

      const passkey = yield* Option.match(maybePasskey, {
        onNone: () =>
          Effect.gen(function* () {
            yield* Effect.logWarning('unknown_credential')
            return yield* Effect.fail(
              new AuthenticationFailedError({ reason: 'unknown credential' }),
            )
          }),
        onSome: found => Effect.succeed(found),
      })

      const challenges = yield* Ref.get(deps.challengesRef)
      const nowMillis = Date.now()

      const transports = filterKnownTransports(passkey.transports)

      const verification = yield* Effect.tryPromise({
        try: () =>
          verifyAuthenticationResponse({
            response: toAuthenticationResponseJSON(payload.response),
            expectedChallenge: (challenge: string) => {
              const maybeRecord = HashMap.get(challenges, challenge)
              if (maybeRecord._tag !== 'Some') {
                return false
              }
              return (
                maybeRecord.value.createdAtMillis + CHALLENGE_MAX_AGE_MILLIS >
                nowMillis
              )
            },
            expectedOrigin: deps.config.origin,
            expectedRPID: deps.config.rpId,
            credential: {
              id: passkey.credentialId,
              publicKey: new Uint8Array(
                Buffer.from(passkey.publicKey, 'base64url'),
              ),
              counter: passkey.counter,
              ...(transports !== undefined ? { transports } : {}),
            },
            requireUserVerification: false,
          }),
        catch: error =>
          new AuthenticationFailedError({ reason: String(error) }),
      })

      if (!verification.verified) {
        yield* Effect.logWarning('auth_verification_failed')
        return yield* Effect.fail(
          new AuthenticationFailedError({ reason: 'verification failed' }),
        )
      }

      const clientDataJson = Buffer.from(
        payload.response.response.clientDataJSON,
        'base64url',
      ).toString('utf8')
      const usedChallenge = yield* Effect.sync(() => {
        try {
          const parsed = JSON.parse(clientDataJson)
          const challenge = parsed?.challenge
          return typeof challenge === 'string' ? challenge : null
        } catch {
          return null
        }
      })
      if (usedChallenge !== null) {
        yield* Ref.update(deps.challengesRef, current =>
          HashMap.remove(current, usedChallenge),
        )
      }

      yield* deps.passkeyStore.updateCounter(
        passkey.credentialId,
        verification.authenticationInfo.newCounter,
      )

      const issued = yield* issueSessionToken(
        'admin',
        deps.config.sessionSecret,
        deps.config.sessionTtlSeconds,
      )

      yield* Effect.logInfo('login_success_passkey', {
        credentialId: passkey.credentialId,
      })

      return {
        sessionToken: SessionToken.make(issued.token),
        expiresAt: issued.expiresAtMillis,
      }
    })
