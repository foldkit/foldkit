import { Rpc } from '@effect/rpc'
import {
  AuthenticationFailedError,
  type RegisteredPasskeySummary,
  UnauthorizedError,
  ValidationError,
  type finishRegisterPasskeyRpc,
} from '@foldkit/now-shared'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { Effect, HashMap, Ref } from 'effect'

import { verifySessionToken } from '../auth/session.js'
import { toRegistrationResponseJSON } from '../auth/webauthnTypes.js'
import { type AppConfigShape } from '../config.js'
import type { ChallengeRecord, PasskeyStoreService } from '../store.js'

const CHALLENGE_MAX_AGE_MILLIS = 5 * 60 * 1000
const LABEL_MIN_LENGTH = 1
const LABEL_MAX_LENGTH = 40
const LABEL_CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/u

export type FinishRegisterPasskeyDeps = Readonly<{
  config: AppConfigShape
  challengesRef: Ref.Ref<HashMap.HashMap<string, ChallengeRecord>>
  passkeyStore: PasskeyStoreService
}>

export const finishRegisterPasskey =
  (deps: FinishRegisterPasskeyDeps) =>
  (
    payload: Rpc.Payload<typeof finishRegisterPasskeyRpc>,
  ): Effect.Effect<
    RegisteredPasskeySummary,
    UnauthorizedError | AuthenticationFailedError | ValidationError
  > =>
    Effect.gen(function* () {
      yield* verifySessionToken(payload.sessionToken, deps.config.sessionSecret)

      if (
        payload.label.length < LABEL_MIN_LENGTH ||
        payload.label.length > LABEL_MAX_LENGTH ||
        LABEL_CONTROL_CHAR_REGEX.test(payload.label)
      ) {
        return yield* Effect.fail(
          new ValidationError({ message: 'invalid passkey label' }),
        )
      }

      const challenges = yield* Ref.get(deps.challengesRef)
      const nowMillis = Date.now()

      const verification = yield* Effect.tryPromise({
        try: () =>
          verifyRegistrationResponse({
            response: toRegistrationResponseJSON(payload.response),
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
            requireUserVerification: false,
          }),
        catch: error =>
          new AuthenticationFailedError({ reason: String(error) }),
      })

      if (
        !verification.verified ||
        verification.registrationInfo === undefined
      ) {
        return yield* Effect.fail(
          new AuthenticationFailedError({
            reason: 'registration verification failed',
          }),
        )
      }

      const registrationInfo = verification.registrationInfo
      const credential = registrationInfo.credential

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

      const publicKeyBase64Url = Buffer.from(credential.publicKey).toString(
        'base64url',
      )

      const registeredAt = Date.now()
      const transports =
        payload.response.response.transports ?? credential.transports ?? []

      yield* deps.passkeyStore.add({
        credentialId: credential.id,
        publicKey: publicKeyBase64Url,
        counter: credential.counter,
        transports: [...transports],
        label: payload.label,
        registeredAt,
      })

      return {
        credentialId: credential.id,
        label: payload.label,
        registeredAt,
      }
    })
