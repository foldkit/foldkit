import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Dom } from 'foldkit'

import {
  ROOM_PAGE_USERNAME_INPUT_ID,
  ROOM_PLAYER_SESSION_KEY,
  USER_GAME_TEXT_INPUT_ID,
} from '../../constant'
import { RoomsClient } from '../../rpc'
import { RoomDefinition } from './definition'
import { Message } from './message'
import { RoomPlayerSession, RoomPlayerSessionJsonString } from './model'

const roomPlayerSessionKey = (roomId: string) =>
  `${ROOM_PLAYER_SESSION_KEY}:${roomId}`

export const FetchRoom = RoomDefinition.makeCommand('FetchRoom', {
  args: { roomId: Schema.String },
  messages: [Message.SucceededFetchRoom, Message.FailedFetchRoom],
  handler: function* () {
    const client = yield* RoomsClient

    return ({ roomId }) =>
      client.getRoomById({ roomId }).pipe(
        Effect.map(room => Message.SucceededFetchRoom({ room })),
        Effect.catch(() => Effect.succeed(Message.FailedFetchRoom())),
      )
  },
})

export const LoadSession = RoomDefinition.makeCommand('LoadSession', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedLoadSession],
  handler: function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ roomId }) =>
      Effect.gen(function* () {
        const scopedSessionJson = yield* store.get(roomPlayerSessionKey(roomId))
        const sessionJson =
          scopedSessionJson ?? (yield* store.get(ROOM_PLAYER_SESSION_KEY))
        const storedSessionJson = yield* Effect.fromOption(
          Option.fromNullishOr(sessionJson),
        )
        const decodeSession = Schema.decodeEffect(RoomPlayerSessionJsonString)

        return yield* decodeSession(storedSessionJson).pipe(
          Effect.map(session =>
            Message.CompletedLoadSession({
              maybeSession: Option.liftPredicate(
                session,
                session => session.roomId === roomId,
              ),
            }),
          ),
        )
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(
            Message.CompletedLoadSession({ maybeSession: Option.none() }),
          ),
        ),
      )
  },
})

export const JoinRoom = RoomDefinition.makeCommand('JoinRoom', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoom, Message.FailedJoinRoom],
  handler: function* () {
    const client = yield* RoomsClient

    return ({ username, roomId }) =>
      client.joinRoom({ username, roomId }).pipe(
        Effect.map(({ player }) => Message.SucceededJoinRoom({ player })),
        Effect.catch(() => Effect.succeed(Message.FailedJoinRoom())),
      )
  },
})

export const StartGame = RoomDefinition.makeCommand('StartGame', {
  args: { roomId: Schema.String, playerId: Schema.String },
  messages: [Message.SucceededStartGame, Message.FailedStartGame],
  handler: function* () {
    const client = yield* RoomsClient

    return ({ roomId, playerId }) =>
      client.startGame({ roomId, playerId }).pipe(
        Effect.as(Message.SucceededStartGame()),
        Effect.catch(() => Effect.succeed(Message.FailedStartGame())),
      )
  },
})

export const UpdatePlayerProgress = RoomDefinition.makeCommand(
  'UpdatePlayerProgress',
  {
    args: {
      playerId: Schema.String,
      gameId: Schema.String,
      userGameText: Schema.String,
      charsTyped: Schema.Number,
    },
    messages: [Message.CompletedUpdatePlayerProgress],
    handler: function* () {
      const client = yield* RoomsClient

      return ({ playerId, gameId, userGameText, charsTyped }) =>
        client
          .updatePlayerProgress({
            playerId,
            gameId,
            userText: userGameText,
            charsTyped,
          })
          .pipe(
            Effect.as(Message.CompletedUpdatePlayerProgress()),
            Effect.catch(() =>
              Effect.succeed(Message.CompletedUpdatePlayerProgress()),
            ),
          )
    },
  },
)

export const CopyRoomId = RoomDefinition.makeCommand('CopyRoomId', {
  args: { roomId: Schema.String },
  messages: [Message.SucceededCopyRoomId, Message.FailedCopyRoomId],
  handler: function* () {
    return ({ roomId }) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(roomId),
        catch: () => new Error('Failed to copy to clipboard'),
      }).pipe(
        Effect.as(Message.SucceededCopyRoomId()),
        Effect.catch(() => Effect.succeed(Message.FailedCopyRoomId())),
      )
  },
})

export const WaitForExitCountdownInterval = RoomDefinition.makeCommand(
  'WaitForExitCountdownInterval',
  {
    messages: [Message.CompletedWaitForExitCountdownInterval],
    handler: function* () {
      return () =>
        Effect.sleep('1 second').pipe(
          Effect.as(Message.CompletedWaitForExitCountdownInterval()),
        )
    },
  },
)

const COPY_INDICATOR_DURATION = '2 seconds'

export const WaitBeforeHidingRoomIdCopiedIndicator = RoomDefinition.makeCommand(
  'WaitBeforeHidingRoomIdCopiedIndicator',
  {
    messages: [Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator],
    handler: function* () {
      return () =>
        Effect.sleep(COPY_INDICATOR_DURATION).pipe(
          Effect.as(Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator()),
        )
    },
  },
)

// SESSION COMMANDS

export const SavePlayerSession = RoomDefinition.makeCommand(
  'SavePlayerSession',
  {
    args: { session: RoomPlayerSession },
    messages: [Message.CompletedSavePlayerSession],
    handler: function* () {
      const store = yield* KeyValueStore.KeyValueStore

      return ({ session }) =>
        Effect.gen(function* () {
          const encodeSession = Schema.encodeEffect(RoomPlayerSessionJsonString)
          const sessionJson = yield* encodeSession(session)
          yield* store.set(roomPlayerSessionKey(session.roomId), sessionJson)
          return Message.CompletedSavePlayerSession()
        }).pipe(
          Effect.catch(() =>
            Effect.succeed(Message.CompletedSavePlayerSession()),
          ),
        )
    },
  },
)

export const ClearSession = RoomDefinition.makeCommand('ClearSession', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedClearSession],
  handler: function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ roomId }) =>
      Effect.gen(function* () {
        yield* store.remove(roomPlayerSessionKey(roomId))

        const maybeLegacySessionJson = Option.fromNullishOr(
          yield* store.get(ROOM_PLAYER_SESSION_KEY),
        )

        if (Option.isSome(maybeLegacySessionJson)) {
          const session = yield* Schema.decodeEffect(
            RoomPlayerSessionJsonString,
          )(maybeLegacySessionJson.value)

          if (session.roomId === roomId) {
            yield* store.remove(ROOM_PLAYER_SESSION_KEY)
          }
        }

        return Message.CompletedClearSession()
      }).pipe(
        Effect.catch(() => Effect.succeed(Message.CompletedClearSession())),
      )
  },
})

export const FocusRoomPageUsernameInput = RoomDefinition.makeCommand(
  'FocusRoomPageUsernameInput',
  {
    messages: [Message.CompletedFocusRoomPageUsernameInput],
    handler: function* () {
      return () =>
        Dom.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusRoomPageUsernameInput()),
        )
    },
  },
)

export const FocusUserGameTextInput = RoomDefinition.makeCommand(
  'FocusUserGameTextInput',
  {
    messages: [Message.CompletedFocusUserGameTextInput],
    handler: function* () {
      return () =>
        Dom.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusUserGameTextInput()),
        )
    },
  },
)
