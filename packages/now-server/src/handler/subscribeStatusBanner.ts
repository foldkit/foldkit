import {
  type StatusBanner,
  type subscribeStatusBannerRpc,
} from '@foldkit/now-shared'
import { Rpc } from '@effect/rpc'
import { type Stream, type SubscriptionRef } from 'effect'

export const subscribeStatusBanner =
  (ref: SubscriptionRef.SubscriptionRef<StatusBanner>) =>
  (
    _payload: Rpc.Payload<typeof subscribeStatusBannerRpc>,
  ): Stream.Stream<StatusBanner> =>
    ref.changes
