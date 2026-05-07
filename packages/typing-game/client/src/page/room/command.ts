import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Function, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Mount } from 'foldkit'

import { ROOM_PLAYER_SESSION_KEY } from '../../constant'
import { RoomsClient, RoomsClientLive } from '../../rpc.js'
import {
  CompletedClearSession,
  CompletedFocusRoomPageUsernameInput,
  CompletedFocusUserGameTextInput,
  CompletedSaveSession,
  CompletedUpdatePlayerProgress,
  FailedCopyClipboard,
  FailedFetchRoom,
  FailedJoinRoom,
  FailedStartGame,
  HidRoomIdCopiedIndicator,
  LoadedSession,
  SucceededCopyRoomId,
  SucceededFetchRoom,
  SucceededJoinRoom,
  SucceededStartGame,
  TickedExitCountdown,
} from './message'
import { RoomPlayerSession } from './model'

export const FetchRoom = Command.define(
  'FetchRoom',
  { roomId: S.String },
  SucceededFetchRoom,
  FailedFetchRoom,
)(({ roomId }) =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const room = yield* client.getRoomById({ roomId })
    return SucceededFetchRoom({ room })
  }).pipe(
    Effect.catch(() => Effect.succeed(FailedFetchRoom({ roomId }))),
    Effect.provide(RoomsClientLive),
  ),
)

export const LoadSession = Command.define(
  'LoadSession',
  { roomId: S.String },
  LoadedSession,
)(({ roomId }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

    const sessionJson = yield* Effect.fromOption(
      Option.fromNullishOr(maybeSessionJson),
    )
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

export const JoinRoom = Command.define(
  'JoinRoom',
  { username: S.String, roomId: S.String },
  SucceededJoinRoom,
  FailedJoinRoom,
)(({ username, roomId }) =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return SucceededJoinRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catch(() => Effect.succeed(FailedJoinRoom())),
    Effect.provide(RoomsClientLive),
  ),
)

export const StartGame = Command.define(
  'StartGame',
  { roomId: S.String, playerId: S.String },
  SucceededStartGame,
  FailedStartGame,
)(({ roomId, playerId }) =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    yield* client.startGame({ roomId, playerId })
    return SucceededStartGame()
  }).pipe(
    Effect.catch(() => Effect.succeed(FailedStartGame())),
    Effect.provide(RoomsClientLive),
  ),
)

export const UpdatePlayerProgress = Command.define(
  'UpdatePlayerProgress',
  {
    playerId: S.String,
    gameId: S.String,
    userGameText: S.String,
    charsTyped: S.Number,
  },
  CompletedUpdatePlayerProgress,
)(({ playerId, gameId, userGameText, charsTyped }) =>
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
    Effect.provide(RoomsClientLive),
  ),
)

export const CopyRoomId = Command.define(
  'CopyRoomId',
  { roomId: S.String },
  SucceededCopyRoomId,
  FailedCopyClipboard,
)(({ roomId }) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(roomId),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(SucceededCopyRoomId()),
    Effect.catch(() => Effect.succeed(FailedCopyClipboard())),
  ),
)

export const TickExitCountdown = Command.define(
  'TickExitCountdown',
  TickedExitCountdown,
)(Effect.sleep('1 second').pipe(Effect.as(TickedExitCountdown())))

const COPY_INDICATOR_DURATION = '2 seconds'

export const HideRoomIdCopiedIndicator = Command.define(
  'HideRoomIdCopiedIndicator',
  HidRoomIdCopiedIndicator,
)(
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HidRoomIdCopiedIndicator()),
  ),
)

// SESSION COMMANDS

export const SavePlayerSession = Command.define(
  'SavePlayerSession',
  { session: RoomPlayerSession },
  CompletedSaveSession,
)(({ session }) =>
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

export const ClearSession = Command.define(
  'ClearSession',
  CompletedClearSession,
)(
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(ROOM_PLAYER_SESSION_KEY)
    return CompletedClearSession()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedClearSession())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  ),
)

// MOUNT

export const FocusRoomPageUsernameInput = Mount.define(
  'FocusRoomPageUsernameInput',
  CompletedFocusRoomPageUsernameInput,
)

export const focusRoomPageUsernameInput = FocusRoomPageUsernameInput(element =>
  Effect.sync(() => {
    if (element instanceof HTMLInputElement) {
      element.focus()
    }
    return {
      message: CompletedFocusRoomPageUsernameInput(),
      cleanup: Function.constVoid,
    }
  }),
)

export const FocusUserGameTextInput = Mount.define(
  'FocusUserGameTextInput',
  CompletedFocusUserGameTextInput,
)

export const focusUserGameTextInput = FocusUserGameTextInput(element =>
  Effect.sync(() => {
    if (element instanceof HTMLTextAreaElement) {
      element.focus()
    }
    return {
      message: CompletedFocusUserGameTextInput(),
      cleanup: Function.constVoid,
    }
  }),
)
