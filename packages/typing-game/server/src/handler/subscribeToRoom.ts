// @ts-nocheck
import * as Shared from '@typing-game/shared'
import {
  Array,
  Duration,
  Effect,
  HashMap,
  HashSet,
  Option,
  Ref,
  Stream,
  Struct,
  SubscriptionRef,
  pipe,
} from 'effect'
import { DurationInput } from 'effect/Duration'
import { Rpc } from 'effect/unstable/rpc'

import { ROOM_UPDATE_THROTTLE_MS } from '../game.js'
import { getPlayerProgress } from '../scoring.js'
import { PendingCleanupPlayerIds, ProgressByGamePlayer } from '../store.js'

const DISCONNECT_CLEANUP_DELAY: DurationInput = '2 seconds'

const removePlayerFromRoom = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  roomId: string,
  playerId: string,
) =>
  SubscriptionRef.update(roomByIdRef, roomById =>
    HashMap.get(roomById, roomId).pipe(
      Option.match({
        onNone: () => roomById,
        onSome: room =>
          pipe(
            room.players,
            Array.filter(player => player.id !== playerId),
            nextPlayers => {
              if (Array.isReadonlyArrayEmpty(nextPlayers)) {
                return HashMap.remove(roomById, roomId)
              }

              const isHostLeaving = room.hostId === playerId
              const nextHostId =
                isHostLeaving && Array.isReadonlyArrayNonEmpty(nextPlayers)
                  ? Array.headNonEmpty(nextPlayers).id
                  : room.hostId

              return HashMap.set(
                roomById,
                roomId,
                Struct.evolve(room, {
                  players: () => nextPlayers,
                  hostId: () => nextHostId,
                }),
              )
            },
          ),
      }),
    ),
  )

const removePlayerProgress = (
  progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  playerId: string,
) =>
  SubscriptionRef.update(progressByGamePlayerRef, progressByGamePlayer =>
    HashMap.filter(
      progressByGamePlayer,
      (_, gamePlayer) => gamePlayer.playerId !== playerId,
    ),
  )

const cancelPendingCleanup = (
  pendingCleanupPlayerIdsRef: Ref.Ref<PendingCleanupPlayerIds>,
  playerId: string,
) => Ref.update(pendingCleanupPlayerIdsRef, HashSet.remove(playerId))

const scheduleDelayedCleanup = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  pendingCleanupPlayerIdsRef: Ref.Ref<PendingCleanupPlayerIds>,
  roomId: string,
  playerId: string,
) =>
  Effect.gen(function* () {
    yield* Ref.update(pendingCleanupPlayerIdsRef, HashSet.add(playerId))

    const scheduledCleanup = Effect.gen(function* () {
      yield* Effect.sleep(DISCONNECT_CLEANUP_DELAY)

      const pendingPlayerIds = yield* Ref.get(pendingCleanupPlayerIdsRef)
      const isStillPending = HashSet.has(pendingPlayerIds, playerId)

      if (isStillPending) {
        yield* removePlayerFromRoom(roomByIdRef, roomId, playerId)
        yield* removePlayerProgress(progressByGamePlayerRef, playerId)
        yield* Ref.update(pendingCleanupPlayerIdsRef, HashSet.remove(playerId))
      }
    })

    yield* Effect.forkChild(scheduledCleanup)
  })

export const subscribeToRoom =
  (
    roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
    progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
    pendingCleanupPlayerIdsRef: Ref.Ref<PendingCleanupPlayerIds>,
  ) =>
  (
    payload: Rpc.Payload<typeof Shared.subscribeToRoomRpc>,
  ): Stream.Stream<Shared.RoomWithPlayerProgress, Shared.RoomNotFoundError> =>
    Stream.execute(
      cancelPendingCleanup(pendingCleanupPlayerIdsRef, payload.playerId),
    ).pipe(
      Stream.concat(roomByIdRef.changes),
      Stream.mapEffect(roomById =>
        Effect.gen(function* () {
          const room = yield* HashMap.get(roomById, payload.roomId).pipe(
            Effect.mapError(
              () => new Shared.RoomNotFoundError({ roomId: payload.roomId }),
            ),
          )

          const maybePlayerProgress = yield* Option.match(room.maybeGame, {
            onSome: game =>
              getPlayerProgress(
                progressByGamePlayerRef,
                payload.playerId,
                game.id,
              ),
            onNone: () => Effect.succeed(Option.none<Shared.PlayerProgress>()),
          })

          return Shared.RoomWithPlayerProgress.make({
            room,
            maybePlayerProgress,
          })
        }),
      ),
      Stream.throttle({
        cost: () => 1,
        duration: Duration.millis(ROOM_UPDATE_THROTTLE_MS),
        units: 1,
      }),
      Stream.ensuring(
        scheduleDelayedCleanup(
          roomByIdRef,
          progressByGamePlayerRef,
          pendingCleanupPlayerIdsRef,
          payload.roomId,
          payload.playerId,
        ),
      ),
    )
