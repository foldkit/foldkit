import { Rpc } from '@effect/rpc'
import {
  type RegistrationOptions as RegistrationOptionsType,
  UnauthorizedError,
  type beginRegisterPasskeyRpc,
} from '@foldkit/now-shared'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { Effect, HashMap, Ref } from 'effect'

import { verifySessionToken } from '../auth/session.js'
import { filterKnownTransports } from '../auth/webauthnTypes.js'
import { type AppConfigShape } from '../config.js'
import type {
  ChallengeRecord,
  PasskeyStoreService,
} from '../store.js'

const CHALLENGE_RETENTION_MILLIS = 5 * 60 * 1000
const ADMIN_USER_NAME = 'admin'
const ADMIN_USER_DISPLAY = 'Foldkit Now Admin'

export type BeginRegisterPasskeyDeps = Readonly<{
  config: AppConfigShape
  challengesRef: Ref.Ref<HashMap.HashMap<string, ChallengeRecord>>
  passkeyStore: PasskeyStoreService
}>

export const beginRegisterPasskey =
  (deps: BeginRegisterPasskeyDeps) =>
  (
    payload: Rpc.Payload<typeof beginRegisterPasskeyRpc>,
  ): Effect.Effect<RegistrationOptionsType, UnauthorizedError> =>
    Effect.gen(function* () {
      const session = yield* verifySessionToken(
        payload.sessionToken,
        deps.config.sessionSecret,
      )

      const existingPasskeys = yield* deps.passkeyStore.list()

      const options = yield* Effect.promise(() =>
        generateRegistrationOptions({
          rpName: deps.config.rpName,
          rpID: deps.config.rpId,
          userName: ADMIN_USER_NAME,
          userID: new TextEncoder().encode(session.adminId),
          userDisplayName: ADMIN_USER_DISPLAY,
          attestationType: 'none',
          excludeCredentials: existingPasskeys.map(p => {
            const transports = filterKnownTransports(p.transports)
            return {
              id: p.credentialId,
              ...(transports !== undefined ? { transports } : {}),
            }
          }),
          authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
          },
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

      return {
        challenge: options.challenge,
        rp: { id: options.rp.id ?? deps.config.rpId, name: options.rp.name },
        user: {
          id: options.user.id,
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map(p => ({
          type: 'public-key' as const,
          alg: p.alg,
        })),
        timeout: options.timeout ?? 60_000,
        attestation: options.attestation ?? 'none',
        excludeCredentials:
          options.excludeCredentials?.map(credential => ({
            id: credential.id,
            type: 'public-key' as const,
            ...(credential.transports
              ? { transports: credential.transports }
              : {}),
          })) ?? [],
        authenticatorSelection: {
          ...(options.authenticatorSelection?.residentKey
            ? { residentKey: options.authenticatorSelection.residentKey }
            : {}),
          ...(options.authenticatorSelection?.userVerification
            ? {
                userVerification:
                  options.authenticatorSelection.userVerification,
              }
            : {}),
          ...(options.authenticatorSelection?.authenticatorAttachment
            ? {
                authenticatorAttachment:
                  options.authenticatorSelection.authenticatorAttachment,
              }
            : {}),
          ...(options.authenticatorSelection?.requireResidentKey !== undefined
            ? {
                requireResidentKey:
                  options.authenticatorSelection.requireResidentKey,
              }
            : {}),
        },
      }
    })
