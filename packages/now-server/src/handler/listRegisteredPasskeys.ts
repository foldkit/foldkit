import { Rpc } from '@effect/rpc'
import {
  type RegisteredPasskeySummary,
  UnauthorizedError,
  type listRegisteredPasskeysRpc,
} from '@foldkit/now-shared'
import { Effect, Option } from 'effect'

import { verifySessionToken } from '../auth/session.js'
import { type AppConfigShape } from '../config.js'
import { type PasskeyStoreService } from '../store.js'

export type ListRegisteredPasskeysDeps = Readonly<{
  config: AppConfigShape
  passkeyStore: PasskeyStoreService
}>

export const listRegisteredPasskeys =
  (deps: ListRegisteredPasskeysDeps) =>
  (
    payload: Rpc.Payload<typeof listRegisteredPasskeysRpc>,
  ): Effect.Effect<
    Readonly<{
      passkeys: ReadonlyArray<RegisteredPasskeySummary>
      passphraseEnabled: boolean
    }>,
    UnauthorizedError
  > =>
    Effect.gen(function* () {
      yield* verifySessionToken(payload.sessionToken, deps.config.sessionSecret)

      const passkeys = yield* deps.passkeyStore.list()
      return {
        passkeys: passkeys.map(p => ({
          credentialId: p.credentialId,
          label: p.label,
          registeredAt: p.registeredAt,
        })),
        passphraseEnabled:
          deps.config.recoveryPassphraseEnabled &&
          Option.isSome(deps.config.maybePassphraseHash),
      }
    })
