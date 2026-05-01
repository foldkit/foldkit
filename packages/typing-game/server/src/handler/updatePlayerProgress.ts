// @ts-nocheck
import { Rpc } from 'effect/unstable/rpc'
import * as Shared from '@typing-game/shared'
import { Clock, Data, Effect, HashMap, SubscriptionRef } from 'effect'

type ProgressByGamePlayer = HashMap.HashMap<
  Shared.GamePlayer,
  Shared.PlayerProgress
>

export const updatePlayerProgress =
  (
    progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  ) =>
  (payload: Rpc.Payload<typeof Shared.updatePlayerProgressRpc>) =>
    Effect.gen(function* () {
      const updatedAt = yield* Clock.currentTimeMillis

      const gamePlayer = Data.Struct(
        Shared.GamePlayer.make({
          gameId: payload.gameId,
          playerId: payload.playerId,
        }),
      )

      const progress = Shared.PlayerProgress.make({
        playerId: payload.playerId,
        gameId: payload.gameId,
        userText: payload.userText,
        updatedAt,
        charsTyped: payload.charsTyped,
      })

      yield* SubscriptionRef.update(
        progressByGamePlayerRef,
        progressByGamePlayer =>
          HashMap.set(progressByGamePlayer, gamePlayer, progress),
      )
    })
