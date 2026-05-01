// @ts-nocheck
import * as Shared from '@typing-game/shared'
import {
  Array,
  Effect,
  HashMap,
  Option,
  Stream,
  Struct,
  SubscriptionRef,
  pipe,
} from 'effect'
import { Rpc } from 'effect/unstable/rpc'
import { randomUUID } from 'node:crypto'

import { gameSequence } from '../game.js'
import { GAME_TEXTS, generateGameText } from '../gameText.js'
import * as Rooms from '../roomById.js'
import { updateRoom, updateRoomStatus } from '../roomById.js'
import { calculateScoreboard } from '../scoring.js'

type ProgressByGamePlayer = HashMap.HashMap<
  Shared.GamePlayer,
  Shared.PlayerProgress
>

export const startGame =
  (
    roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
    progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  ) =>
  (payload: Rpc.Payload<typeof Shared.startGameRpc>) =>
    Effect.gen(function* () {
      const roomById = yield* SubscriptionRef.get(roomByIdRef)
      const room = yield* Rooms.getById(roomById, payload.roomId)

      if (room.hostId !== payload.playerId) {
        return yield* Effect.fail(
          new Shared.UnauthorizedError({
            message: 'Only the host can start the game',
          }),
        )
      }

      const gameId = yield* Effect.sync(() => randomUUID())
      const gameText = yield* generateGameText(room.usedGameTexts)

      const game = Shared.Game.make({
        id: gameId,
        text: gameText,
      })

      const nextUsedGameTexts = pipe(
        Array.difference(GAME_TEXTS, room.usedGameTexts),
        Array.match({
          onEmpty: () => Array.make(gameText),
          onNonEmpty: () => Array.append(room.usedGameTexts, gameText),
        }),
      )

      yield* updateRoom(
        roomByIdRef,
        payload.roomId,
      )(room =>
        Struct.evolve(room, {
          maybeGame: () => Option.some(game),
          maybeScoreboard: () => Option.none(),
          usedGameTexts: () => nextUsedGameTexts,
        }),
      )

      return yield* gameSequence.pipe(
        Stream.mapEffect(updateRoomStatus(roomByIdRef, payload.roomId), {
          concurrency: 'unbounded',
        }),
        Stream.runDrain,
        Effect.flatMap(
          finalizeGameScoreboard(
            roomByIdRef,
            progressByGamePlayerRef,
            payload.roomId,
          ),
        ),
        Effect.forkDetach,
      )
    })

const finalizeGameScoreboard = (
  roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
  progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  roomId: string,
) =>
  Effect.gen(function* () {
    const roomById = yield* SubscriptionRef.get(roomByIdRef)
    const room = yield* Rooms.getById(roomById, roomId)
    const progressByGamePlayer = yield* SubscriptionRef.get(
      progressByGamePlayerRef,
    )
    const maybeScoreboard = Option.some(
      calculateScoreboard(room, progressByGamePlayer),
    )

    yield* updateRoom(
      roomByIdRef,
      roomId,
    )(Struct.evolve({ maybeScoreboard: () => maybeScoreboard }))
  })
