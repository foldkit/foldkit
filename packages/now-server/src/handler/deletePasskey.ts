import { Rpc } from '@effect/rpc'
import {
  UnauthorizedError,
  ValidationError,
  type deletePasskeyRpc,
} from '@foldkit/now-shared'
import { Effect } from 'effect'

import { verifySessionToken } from '../auth/session.js'
import { type AppConfigShape } from '../config.js'
import { type PasskeyStoreService } from '../store.js'

export type DeletePasskeyDeps = Readonly<{
  config: AppConfigShape
  passkeyStore: PasskeyStoreService
}>

export const deletePasskey =
  (deps: DeletePasskeyDeps) =>
  (
    payload: Rpc.Payload<typeof deletePasskeyRpc>,
  ): Effect.Effect<void, UnauthorizedError | ValidationError> =>
    Effect.gen(function* () {
      yield* verifySessionToken(payload.sessionToken, deps.config.sessionSecret)

      const existing = yield* deps.passkeyStore.list()
      const match = existing.find(p => p.credentialId === payload.credentialId)
      if (!match) {
        return yield* Effect.fail(
          new ValidationError({ message: 'credential not found' }),
        )
      }

      yield* deps.passkeyStore.remove(payload.credentialId)
    })
