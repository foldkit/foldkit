// @ts-nocheck
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Task } from 'foldkit'

import { ROOM_PLAYER_SESSION_KEY } from '../../constant'
import { RoomsClient } from '../../rpc'
import {
  CompletedClearSession,
  CompletedRequestGameStart,
  CompletedSaveSession,
  CompletedUpdatePlayerProgress,
  FailedCopyClipboard,
  FailedFetchRoom,
  FailedJoinRoom,
  HiddenRoomIdCopiedIndicator,
  LoadedSession,
  SucceededCopyRoomId,
  SucceededFetchRoom,
  SucceededJoinRoom,
  TickedExitCountdown,
} from './message'
import { RoomPlayerSession } from './model'

const FetchRoom = Command.define(
  'FetchRoom',
  SucceededFetchRoom,
  FailedFetchRoom,
)
const LoadSession = Command.define('LoadSession', LoadedSession)
const JoinRoom = Command.define('JoinRoom', SucceededJoinRoom, FailedJoinRoom)
const StartGame = Command.define('StartGame', CompletedRequestGameStart)
const UpdatePlayerProgress = Command.define(
  'UpdatePlayerProgress',
  CompletedUpdatePlayerProgress,
)
const CopyRoomId = Command.define(
  'CopyRoomId',
  SucceededCopyRoomId,
  FailedCopyClipboard,
)
const TickExitCountdown = Command.define(
  'TickExitCountdown',
  TickedExitCountdown,
)
const HideRoomIdCopiedIndicator = Command.define(
  'HideRoomIdCopiedIndicator',
  HiddenRoomIdCopiedIndicator,
)

export const getRoomById = (roomId: string) =>
  FetchRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const room = yield* client.getRoomById({ roomId })
      return SucceededFetchRoom({ room })
    }).pipe(
      Effect.catch(() => Effect.succeed(FailedFetchRoom({ roomId }))),
      Effect.provide(RoomsClient.Default),
    ),
  )

export const loadSessionFromStorage = (roomId: string) =>
  LoadSession(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

      const sessionJson = yield* maybeSessionJson
      const decodeSession = S.decodeEffect(S.fromJsonString(RoomPlayerSession))

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
      Effect.catch(() =>
        Effect.succeed(LoadedSession({ maybeSession: Option.none() })),
      ),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
  )

export const joinRoom = (username: string, roomId: string) =>
  JoinRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player, room } = yield* client.joinRoom({ username, roomId })
      return SucceededJoinRoom({ roomId: room.id, player })
    }).pipe(
      Effect.catch(() => Effect.succeed(FailedJoinRoom())),
      Effect.provide(RoomsClient.Default),
    ),
  )

export const startGame = (roomId: string, playerId: string) =>
  StartGame(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      yield* client.startGame({ roomId, playerId })
      return CompletedRequestGameStart()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedRequestGameStart())),
      Effect.provide(RoomsClient.Default),
    ),
  )

export const updatePlayerProgress = (
  playerId: string,
  gameId: string,
  userGameText: string,
  charsTyped: number,
) =>
  UpdatePlayerProgress(
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
      Effect.catch(() => Effect.succeed(CompletedUpdatePlayerProgress())),
      Effect.provide(RoomsClient.Default),
    ),
  )

export const copyRoomIdToClipboard = (roomId: string) =>
  CopyRoomId(
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(roomId),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(SucceededCopyRoomId()),
      Effect.catch(() => Effect.succeed(FailedCopyClipboard())),
    ),
  )

export const tickExitCountdown = TickExitCountdown(
  Task.delay('1 second').pipe(Effect.as(TickedExitCountdown())),
)

const COPY_INDICATOR_DURATION = '2 seconds'

export const hideRoomIdCopiedIndicator = () =>
  HideRoomIdCopiedIndicator(
    Effect.sleep(COPY_INDICATOR_DURATION).pipe(
      Effect.as(HiddenRoomIdCopiedIndicator()),
    ),
  )

// SESSION COMMANDS

const SavePlayerSession = Command.define(
  'SavePlayerSession',
  CompletedSaveSession,
)
const ClearSession = Command.define('ClearSession', CompletedClearSession)

export const savePlayerSession = (session: RoomPlayerSession) =>
  SavePlayerSession(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encodeSession = S.encodeEffect(S.fromJsonString(RoomPlayerSession))
      const sessionJson = yield* encodeSession(session)
      yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
      return CompletedSaveSession()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedSaveSession())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
  )

export const clearSession = () =>
  ClearSession(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.remove(ROOM_PLAYER_SESSION_KEY)
      return CompletedClearSession()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedClearSession())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
  )
