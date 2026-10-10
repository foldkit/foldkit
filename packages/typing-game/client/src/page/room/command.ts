import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Command, Dom } from 'foldkit'

import {
  ROOM_PAGE_USERNAME_INPUT_ID,
  ROOM_PLAYER_SESSION_KEY,
  USER_GAME_TEXT_INPUT_ID,
} from '../../constant'
import { RoomsClient } from '../../rpc'
import { Message } from './message'
import { RoomPlayerSession, RoomPlayerSessionJsonString } from './model'

export const FetchRoom = Command.define(
  'FetchRoom',
  {
    args: { roomId: Schema.String },
    messages: [Message.SucceededFetchRoom, Message.FailedFetchRoom],
  },
  Effect.gen(function* () {
    const client = yield* RoomsClient

    return ({ roomId }) =>
      client.getRoomById({ roomId }).pipe(
        Effect.map(room => Message.SucceededFetchRoom({ room })),
        Effect.catch(() => Effect.succeed(Message.FailedFetchRoom())),
      )
  }),
)

export const LoadSession = Command.define(
  'LoadSession',
  {
    args: { roomId: Schema.String },
    messages: [Message.CompletedLoadSession],
  },
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ roomId }) =>
      Effect.gen(function* () {
        const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

        const sessionJson = yield* Effect.fromOption(
          Option.fromNullishOr(maybeSessionJson),
        )
        const decodeSession = Schema.decodeEffect(RoomPlayerSessionJsonString)

        return yield* decodeSession(sessionJson).pipe(
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
  }),
)

export const JoinRoom = Command.define(
  'JoinRoom',
  {
    args: { username: Schema.String, roomId: Schema.String },
    messages: [Message.SucceededJoinRoom, Message.FailedJoinRoom],
  },
  Effect.gen(function* () {
    const client = yield* RoomsClient

    return ({ username, roomId }) =>
      client.joinRoom({ username, roomId }).pipe(
        Effect.map(({ player }) => Message.SucceededJoinRoom({ player })),
        Effect.catch(() => Effect.succeed(Message.FailedJoinRoom())),
      )
  }),
)

export const StartGame = Command.define(
  'StartGame',
  {
    args: { roomId: Schema.String, playerId: Schema.String },
    messages: [Message.SucceededStartGame, Message.FailedStartGame],
  },
  Effect.gen(function* () {
    const client = yield* RoomsClient

    return ({ roomId, playerId }) =>
      client.startGame({ roomId, playerId }).pipe(
        Effect.as(Message.SucceededStartGame()),
        Effect.catch(() => Effect.succeed(Message.FailedStartGame())),
      )
  }),
)

export const UpdatePlayerProgress = Command.define(
  'UpdatePlayerProgress',
  {
    args: {
      playerId: Schema.String,
      gameId: Schema.String,
      userGameText: Schema.String,
      charsTyped: Schema.Number,
    },
    messages: [Message.CompletedUpdatePlayerProgress],
  },
  Effect.gen(function* () {
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
  }),
)

export const CopyRoomId = Command.define(
  'CopyRoomId',
  {
    args: { roomId: Schema.String },
    messages: [Message.SucceededCopyRoomId, Message.FailedCopyRoomId],
  },
  Effect.succeed(({ roomId }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(roomId),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(Message.SucceededCopyRoomId()),
      Effect.catch(() => Effect.succeed(Message.FailedCopyRoomId())),
    ),
  ),
)

export const WaitForExitCountdownInterval = Command.define(
  'WaitForExitCountdownInterval',
  {
    messages: [Message.CompletedWaitForExitCountdownInterval],
  },
  Effect.succeed(() =>
    Effect.sleep('1 second').pipe(
      Effect.as(Message.CompletedWaitForExitCountdownInterval()),
    ),
  ),
)

const COPY_INDICATOR_DURATION = '2 seconds'

export const WaitBeforeHidingRoomIdCopiedIndicator = Command.define(
  'WaitBeforeHidingRoomIdCopiedIndicator',
  {
    messages: [Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator],
  },
  Effect.succeed(() =>
    Effect.sleep(COPY_INDICATOR_DURATION).pipe(
      Effect.as(Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator()),
    ),
  ),
)

// SESSION COMMANDS

export const SavePlayerSession = Command.define(
  'SavePlayerSession',
  {
    args: { session: RoomPlayerSession },
    messages: [Message.CompletedSavePlayerSession],
  },
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return ({ session }) =>
      Effect.gen(function* () {
        const encodeSession = Schema.encodeEffect(RoomPlayerSessionJsonString)
        const sessionJson = yield* encodeSession(session)
        yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
        return Message.CompletedSavePlayerSession()
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(Message.CompletedSavePlayerSession()),
        ),
      )
  }),
)

export const ClearSession = Command.define(
  'ClearSession',
  {
    messages: [Message.CompletedClearSession],
  },
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore

    return () =>
      store.remove(ROOM_PLAYER_SESSION_KEY).pipe(
        Effect.as(Message.CompletedClearSession()),
        Effect.catch(() => Effect.succeed(Message.CompletedClearSession())),
      )
  }),
)

export const FocusRoomPageUsernameInput = Command.define(
  'FocusRoomPageUsernameInput',
  {
    messages: [Message.CompletedFocusRoomPageUsernameInput],
  },
  Effect.succeed(() =>
    Dom.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusRoomPageUsernameInput()),
    ),
  ),
)

export const FocusUserGameTextInput = Command.define(
  'FocusUserGameTextInput',
  {
    messages: [Message.CompletedFocusUserGameTextInput],
  },
  Effect.succeed(() =>
    Dom.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusUserGameTextInput()),
    ),
  ),
)
