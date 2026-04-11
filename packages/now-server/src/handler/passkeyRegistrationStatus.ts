import { Rpc } from '@effect/rpc'
import { type passkeyRegistrationStatusRpc } from '@foldkit/now-shared'
import { Effect, Option } from 'effect'

import { type AppConfigShape } from '../config.js'
import { type PasskeyStoreService } from '../store.js'

export type PasskeyRegistrationStatusDeps = Readonly<{
  config: AppConfigShape
  passkeyStore: PasskeyStoreService
}>

export const passkeyRegistrationStatus =
  (deps: PasskeyRegistrationStatusDeps) =>
  (
    _payload: Rpc.Payload<typeof passkeyRegistrationStatusRpc>,
  ): Effect.Effect<
    Readonly<{
      hasRegisteredPasskey: boolean
      passphraseEnabled: boolean
    }>
  > =>
    Effect.gen(function* () {
      const passkeys = yield* deps.passkeyStore.list()
      return {
        hasRegisteredPasskey: passkeys.length > 0,
        passphraseEnabled:
          deps.config.recoveryPassphraseEnabled &&
          Option.isSome(deps.config.maybePassphraseHash),
      }
    })
