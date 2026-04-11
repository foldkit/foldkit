import { Rpc } from '@effect/rpc'
import {
  type AuthenticationOptions,
  type beginAuthenticationRpc,
} from '@foldkit/now-shared'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { Effect, HashMap, Ref } from 'effect'

import { filterKnownTransports } from '../auth/webauthnTypes.js'
import { type AppConfigShape } from '../config.js'
import type { ChallengeRecord, PasskeyStoreService } from '../store.js'

const CHALLENGE_RETENTION_MILLIS = 2 * 60 * 1000

export type BeginAuthenticationDeps = Readonly<{
  config: AppConfigShape
  challengesRef: Ref.Ref<HashMap.HashMap<string, ChallengeRecord>>
  passkeyStore: PasskeyStoreService
}>

export const beginAuthentication =
  (deps: BeginAuthenticationDeps) =>
  (
    _payload: Rpc.Payload<typeof beginAuthenticationRpc>,
  ): Effect.Effect<AuthenticationOptions> =>
    Effect.gen(function* () {
      const registeredPasskeys = yield* deps.passkeyStore.list()

      const options = yield* Effect.promise(() =>
        generateAuthenticationOptions({
          rpID: deps.config.rpId,
          allowCredentials: registeredPasskeys.map(passkey => {
            const transports = filterKnownTransports(passkey.transports)
            return {
              id: passkey.credentialId,
              ...(transports !== undefined ? { transports } : {}),
            }
          }),
          userVerification: 'preferred',
          timeout: 60_000,
        }),
      )

      const nowMillis = Date.now()
      yield* Ref.update(deps.challengesRef, challenges => {
        const withoutExpired = HashMap.filter(
          challenges,
          (record: ChallengeRecord) =>
            record.createdAtMillis + CHALLENGE_RETENTION_MILLIS > nowMillis,
        )
        return HashMap.set(withoutExpired, options.challenge, {
          challenge: options.challenge,
          createdAtMillis: nowMillis,
        })
      })

      yield* Effect.logInfo('login_begin')

      return {
        challenge: options.challenge,
        allowCredentials:
          options.allowCredentials?.map(credential => ({
            id: credential.id,
            type: 'public-key' as const,
            ...(credential.transports
              ? { transports: credential.transports }
              : {}),
          })) ?? [],
        timeout: options.timeout ?? 60_000,
        rpId: options.rpId ?? deps.config.rpId,
        userVerification: options.userVerification ?? 'preferred',
      }
    })
