// @ts-nocheck
import * as Shared from '@typing-game/shared'
import { Context, HashMap, HashSet, Layer, Ref, SubscriptionRef } from 'effect'

type RoomId = string
type RoomById = HashMap.HashMap<RoomId, Shared.Room>

export class RoomByIdStore extends Context.Service<
  RoomByIdStore,
  SubscriptionRef.SubscriptionRef<RoomById>
>()('RoomByIdStore') {}

export const RoomByIdStoreLive = Layer.effect(
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

export const ProgressByGamePlayerStoreLive = Layer.effect(
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

export const PendingCleanupPlayerIdsStoreLive = Layer.effect(
  PendingCleanupPlayerIdsStore,
  Ref.make(HashSet.empty<string>()),
)
