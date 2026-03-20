import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { Command, Task } from 'foldkit'

import { ROOM_PLAYER_SESSION_KEY } from '../../constant'
import { RoomsClient } from '../../rpc'
import {
  CompletedRequestGameStart,
  CompletedUpdatePlayerProgress,
  FailedCopyClipboard,
  FailedFetchRoom,
  FailedJoinRoom,
  HiddenRoomIdCopiedIndicator,
  JoinedRoom,
  LoadedSession,
  SucceededCopyRoomId,
  SucceededFetchRoom,
  TickedExitCountdown,
} from './message'
import { RoomPlayerSession } from './model'

export const getRoomById = (
  roomId: string,
): Command.Command<typeof SucceededFetchRoom | typeof FailedFetchRoom> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const room = yield* client.getRoomById({ roomId })
    return SucceededFetchRoom({ room })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(FailedFetchRoom({ roomId }))),
    Effect.provide(RoomsClient.Default),
    Command.make('FetchRoom'),
  )

export const loadSessionFromStorage = (
  roomId: string,
): Command.Command<typeof LoadedSession> =>
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
    Command.make('LoadSession'),
  )

export const joinRoom = (
  username: string,
  roomId: string,
): Command.Command<typeof JoinedRoom | typeof FailedJoinRoom> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return JoinedRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll(() => Effect.succeed(FailedJoinRoom())),
    Effect.provide(RoomsClient.Default),
    Command.make('JoinRoom'),
  )

export const startGame = (
  roomId: string,
  playerId: string,
): Command.Command<typeof CompletedRequestGameStart> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.startGame({ roomId, playerId })
    return CompletedRequestGameStart()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(CompletedRequestGameStart())),
    Effect.provide(RoomsClient.Default),
    Command.make('StartGame'),
  )

export const updatePlayerProgress = (
  playerId: string,
  gameId: string,
  userGameText: string,
  charsTyped: number,
): Command.Command<typeof CompletedUpdatePlayerProgress> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.updatePlayerProgress({
      playerId,
      gameId,
      userText: userGameText,
      charsTyped,
    })
    return CompletedUpdatePlayerProgress()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(CompletedUpdatePlayerProgress())),
    Effect.provide(RoomsClient.Default),
    Command.make('UpdatePlayerProgress'),
  )

export const copyRoomIdToClipboard = (
  roomId: string,
): Command.Command<typeof SucceededCopyRoomId | typeof FailedCopyClipboard> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(roomId),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(SucceededCopyRoomId()),
    Effect.catchAll(() => Effect.succeed(FailedCopyClipboard())),
    Command.make('CopyRoomId'),
  )

export const tickExitCountdown: Command.Command<typeof TickedExitCountdown> =
  Task.delay('1 second').pipe(
    Effect.as(TickedExitCountdown()),
    Command.make('TickExitCountdown'),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

export const hideRoomIdCopiedIndicator = (): Command.Command<
  typeof HiddenRoomIdCopiedIndicator
> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HiddenRoomIdCopiedIndicator()),
    Command.make('HideRoomIdCopiedIndicator'),
  )
