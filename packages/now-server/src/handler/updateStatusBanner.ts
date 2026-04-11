import { Rpc } from '@effect/rpc'
import {
  InvalidNonceError,
  StaleRequestError,
  type StatusBanner,
  UnauthorizedError,
  type updateStatusBannerRpc,
} from '@foldkit/now-shared'
import { Effect, SubscriptionRef } from 'effect'

import { type NonceTracker } from '../auth/nonceTracker.js'
import { verifySessionToken } from '../auth/session.js'
import { type AppConfigShape } from '../config.js'
import { type BannerStoreService } from '../store.js'

export type UpdateStatusBannerDeps = Readonly<{
  config: AppConfigShape
  updateNonceTracker: NonceTracker
  bannerStore: BannerStoreService
}>

export const updateStatusBanner =
  (deps: UpdateStatusBannerDeps) =>
  (
    payload: Rpc.Payload<typeof updateStatusBannerRpc>,
  ): Effect.Effect<
    void,
    UnauthorizedError | InvalidNonceError | StaleRequestError
  > =>
    Effect.gen(function* () {
      yield* verifySessionToken(payload.sessionToken, deps.config.sessionSecret)

      const nowMillis = Date.now()
      const requestAgeSeconds = (nowMillis - payload.issuedAt) / 1000
      if (
        requestAgeSeconds > deps.config.updateRequestMaxAgeSeconds ||
        requestAgeSeconds < -deps.config.updateRequestMaxAgeSeconds
      ) {
        yield* Effect.logWarning('update_stale', { requestAgeSeconds })
        return yield* Effect.fail(
          new StaleRequestError({
            message: 'update request timestamp out of range',
          }),
        )
      }

      const nonceAccepted = yield* deps.updateNonceTracker.registerNonce(
        payload.nonce,
      )
      if (!nonceAccepted) {
        yield* Effect.logWarning('update_nonce_replay')
        return yield* Effect.fail(
          new InvalidNonceError({ message: 'nonce already used' }),
        )
      }

      const nextBanner: StatusBanner = payload.banner

      yield* SubscriptionRef.set(deps.bannerStore.ref, nextBanner)
      yield* deps.bannerStore.persist(nextBanner)

      yield* Effect.logInfo('update_success', {
        messagePreview: nextBanner.message.slice(0, 32),
      })
    })
