import { Effect, Match as M, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Dom } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { ts } from 'foldkit/schema'

import {
  ROOM_PAGE_USERNAME_INPUT_ID,
  ROOM_PLAYER_SESSION_KEY,
  USER_GAME_TEXT_INPUT_ID,
} from '../../constant'
import { homeRouter } from '../../route'
import { RoomsClient } from '../../rpc.js'
import {
  CompletedClearSession,
  CompletedFocusRoomPageUsernameInput,
  CompletedFocusUserGameTextInput,
  CompletedNavigateHome,
  CompletedSaveSession,
  CompletedUpdatePlayerProgress,
  FailedCopyClipboard,
  FailedFetchRoom,
  FailedJoinRoom,
  FailedStartGame,
  HidRoomIdCopiedIndicator,
  LoadedSession,
  Message,
  SucceededCopyRoomId,
  SucceededFetchRoom,
  SucceededJoinRoom,
  SucceededStartGame,
  TickedExitCountdown,
} from './message'
import { RoomPlayerSession } from './model'

export const FetchRoom = ts('FetchRoom', { roomId: S.String })
export const LoadSession = ts('LoadSession', { roomId: S.String })
export const JoinRoom = ts('JoinRoom', {
  username: S.String,
  roomId: S.String,
})
export const StartGame = ts('StartGame', {
  roomId: S.String,
  playerId: S.String,
})
export const UpdatePlayerProgress = ts('UpdatePlayerProgress', {
  playerId: S.String,
  gameId: S.String,
  userGameText: S.String,
  charsTyped: S.Number,
})
export const CopyRoomId = ts('CopyRoomId', { roomId: S.String })
export const TickExitCountdown = ts('TickExitCountdown')
export const HideRoomIdCopiedIndicator = ts('HideRoomIdCopiedIndicator')
export const SavePlayerSession = ts('SavePlayerSession', {
  session: RoomPlayerSession,
})
export const ClearSession = ts('ClearSession')
export const FocusRoomPageUsernameInput = ts('FocusRoomPageUsernameInput')
export const FocusUserGameTextInput = ts('FocusUserGameTextInput')
export const NavigateHome = ts('NavigateHome')

export const Command = S.Union([
  FetchRoom,
  LoadSession,
  JoinRoom,
  StartGame,
  UpdatePlayerProgress,
  CopyRoomId,
  TickExitCountdown,
  HideRoomIdCopiedIndicator,
  SavePlayerSession,
  ClearSession,
  FocusRoomPageUsernameInput,
  FocusUserGameTextInput,
  NavigateHome,
])
export type Command = typeof Command.Type

const COPY_INDICATOR_DURATION = '2 seconds'

export const execute = (
  command: Command,
): Effect.Effect<Message, never, RoomsClient | KeyValueStore.KeyValueStore> =>
  M.value(command).pipe(
    M.tagsExhaustive({
      FetchRoom: ({ roomId }) =>
        Effect.gen(function* () {
          const client = yield* RoomsClient
          const room = yield* client.getRoomById({ roomId })
          return SucceededFetchRoom({ room })
        }).pipe(Effect.catch(() => Effect.succeed(FailedFetchRoom()))),

      LoadSession: ({ roomId }) =>
        Effect.gen(function* () {
          const store = yield* KeyValueStore.KeyValueStore
          const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

          const sessionJson = yield* Effect.fromOption(
            Option.fromNullishOr(maybeSessionJson),
          )
          const decodeSession = S.decodeEffect(
            S.fromJsonString(RoomPlayerSession),
          )

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
        ),

      JoinRoom: ({ username, roomId }) =>
        Effect.gen(function* () {
          const client = yield* RoomsClient
          const { player } = yield* client.joinRoom({ username, roomId })
          return SucceededJoinRoom({ player })
        }).pipe(Effect.catch(() => Effect.succeed(FailedJoinRoom()))),

      StartGame: ({ roomId, playerId }) =>
        Effect.gen(function* () {
          const client = yield* RoomsClient
          yield* client.startGame({ roomId, playerId })
          return SucceededStartGame()
        }).pipe(Effect.catch(() => Effect.succeed(FailedStartGame()))),

      UpdatePlayerProgress: ({ playerId, gameId, userGameText, charsTyped }) =>
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
        ),

      CopyRoomId: ({ roomId }) =>
        Effect.tryPromise({
          try: () => navigator.clipboard.writeText(roomId),
          catch: () => new Error('Failed to copy to clipboard'),
        }).pipe(
          Effect.as(SucceededCopyRoomId()),
          Effect.catch(() => Effect.succeed(FailedCopyClipboard())),
        ),

      TickExitCountdown: () =>
        Effect.sleep('1 second').pipe(Effect.as(TickedExitCountdown())),

      HideRoomIdCopiedIndicator: () =>
        Effect.sleep(COPY_INDICATOR_DURATION).pipe(
          Effect.as(HidRoomIdCopiedIndicator()),
        ),

      SavePlayerSession: ({ session }) =>
        Effect.gen(function* () {
          const store = yield* KeyValueStore.KeyValueStore
          const encodeSession = S.encodeEffect(
            S.fromJsonString(RoomPlayerSession),
          )
          const sessionJson = yield* encodeSession(session)
          yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
          return CompletedSaveSession()
        }).pipe(Effect.catch(() => Effect.succeed(CompletedSaveSession()))),

      ClearSession: () =>
        Effect.gen(function* () {
          const store = yield* KeyValueStore.KeyValueStore
          yield* store.remove(ROOM_PLAYER_SESSION_KEY)
          return CompletedClearSession()
        }).pipe(Effect.catch(() => Effect.succeed(CompletedClearSession()))),

      FocusRoomPageUsernameInput: () =>
        Dom.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(CompletedFocusRoomPageUsernameInput()),
        ),

      FocusUserGameTextInput: () =>
        Dom.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(CompletedFocusUserGameTextInput()),
        ),

      NavigateHome: () =>
        pushUrl(homeRouter()).pipe(Effect.as(CompletedNavigateHome())),
    }),
  )
