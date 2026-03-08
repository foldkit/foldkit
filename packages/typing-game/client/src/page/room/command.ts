import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { Task } from 'foldkit'
import { Command } from 'foldkit/command'

import { ROOM_PLAYER_SESSION_KEY } from '../../constant'
import { RoomsClient } from '../../rpc'
import {
  FailedRoomFetch,
  HiddenRoomIdCopiedIndicator,
  JoinedRoom,
  LoadedSession,
  NoOp,
  SucceededCopyRoomId,
  SucceededRoomFetch,
  TickedExitCountdown,
} from './message'
import { RoomPlayerSession } from './model'

export const getRoomById = (
  roomId: string,
): Command<typeof SucceededRoomFetch | typeof FailedRoomFetch> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const room = yield* client.getRoomById({ roomId })
    return SucceededRoomFetch({ room })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(FailedRoomFetch({ roomId }))),
    Effect.provide(RoomsClient.Default),
  )

export const loadSessionFromStorage = (
  roomId: string,
): Command<typeof LoadedSession> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

    const sessionJson = yield* maybeSessionJson
    const decodeSession = S.decode(S.parseJson(RoomPlayerSession))

    return yield* decodeSession(sessionJson).pipe(
      Effect.map(session =>
        LoadedSession({
          maybeSession: Option.liftPredicate(
            session,
            session => session.roomId === roomId,
          ),
        }),
      ),
    )
  }).pipe(
    Effect.catchAll(() =>
      Effect.succeed(LoadedSession({ maybeSession: Option.none() })),
    ),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )

export const joinRoom = (
  username: string,
  roomId: string,
): Command<typeof JoinedRoom | typeof NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return JoinedRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(RoomsClient.Default),
  )

export const startGame = (
  roomId: string,
  playerId: string,
): Command<typeof NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.startGame({ roomId, playerId })
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(RoomsClient.Default),
  )

export const updatePlayerProgress = (
  playerId: string,
  gameId: string,
  userGameText: string,
  charsTyped: number,
): Command<typeof NoOp> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.updatePlayerProgress({
      playerId,
      gameId,
      userText: userGameText,
      charsTyped,
    })
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(RoomsClient.Default),
  )

export const copyRoomIdToClipboard = (
  roomId: string,
): Command<typeof SucceededCopyRoomId | typeof NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(roomId),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(SucceededCopyRoomId()),
    Effect.catchAll(() => Effect.succeed(NoOp())),
  )

export const exitCountdownTick: Command<typeof TickedExitCountdown> =
  Task.delay('1 second').pipe(Effect.as(TickedExitCountdown()))

const COPY_INDICATOR_DURATION = '2 seconds'

export const hideRoomIdCopiedIndicator = (): Command<
  typeof HiddenRoomIdCopiedIndicator
> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HiddenRoomIdCopiedIndicator()),
  )
