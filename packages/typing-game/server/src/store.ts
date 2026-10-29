import { Context, HashMap, HashSet, Layer, Ref, SubscriptionRef } from 'effect'

import * as Shared from '@typing-game/shared'

type RoomId = string
type RoomById = HashMap.HashMap<RoomId, Shared.Room>

export class RoomByIdStore extends Context.Service<
  RoomByIdStore,
  SubscriptionRef.SubscriptionRef<RoomById>
>()('RoomByIdStore') {}

export const RoomByIdStoreLayer = Layer.effect(
  RoomByIdStore,
  SubscriptionRef.make(HashMap.empty<string, Shared.Room>()),
)

export type ProgressByGamePlayer = HashMap.HashMap<
  Shared.GamePlayer,
  Shared.PlayerProgress
>

export class ProgressByGamePlayerStore extends Context.Service<
  ProgressByGamePlayerStore,
  SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>
>()('ProgressByGamePlayerStore') {}

export const ProgressByGamePlayerStoreLayer = Layer.effect(
  ProgressByGamePlayerStore,
  SubscriptionRef.make(
    HashMap.empty<Shared.GamePlayer, Shared.PlayerProgress>(),
  ),
)

type PlayerId = string
export type PendingCleanupPlayerIds = HashSet.HashSet<PlayerId>

export class PendingCleanupPlayerIdsStore extends Context.Service<
  PendingCleanupPlayerIdsStore,
  Ref.Ref<PendingCleanupPlayerIds>
>()('PendingCleanupPlayerIdsStore') {}

export const PendingCleanupPlayerIdsStoreLayer = Layer.effect(
  PendingCleanupPlayerIdsStore,
  Ref.make(HashSet.empty<string>()),
)
