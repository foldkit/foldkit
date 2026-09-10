import { Effect, Option, Schema } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Dom } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  ROOM_PAGE_USERNAME_INPUT_ID,
  ROOM_PLAYER_SESSION_KEY,
  USER_GAME_TEXT_INPUT_ID,
} from '../../constant'
import { RoomsClient } from '../../rpc'
import { Message } from './message'
import { RoomPlayerSession, RoomPlayerSessionJsonString } from './model'

export const FetchRoom = Command.define('FetchRoom', {
  args: { roomId: Schema.String },
  messages: [Message.SucceededFetchRoom, Message.FailedFetchRoom],
  execute: ({ roomId }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const room = yield* client.getRoomById({ roomId })
      return Message.SucceededFetchRoom({ room })
    }).pipe(Effect.catch(() => Effect.succeed(Message.FailedFetchRoom()))),
})

export const LoadSession = Command.define('LoadSession', {
  args: { roomId: Schema.String },
  messages: [Message.CompletedLoadSession],
  execute: ({ roomId }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
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
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
})

export const JoinRoom = Command.define('JoinRoom', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoom, Message.FailedJoinRoom],
  execute: ({ username, roomId }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player } = yield* client.joinRoom({ username, roomId })
      return Message.SucceededJoinRoom({ player })
    }).pipe(Effect.catch(() => Effect.succeed(Message.FailedJoinRoom()))),
})

export const StartGame = Command.define('StartGame', {
  args: { roomId: Schema.String, playerId: Schema.String },
  messages: [Message.SucceededStartGame, Message.FailedStartGame],
  execute: ({ roomId, playerId }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      yield* client.startGame({ roomId, playerId })
      return Message.SucceededStartGame()
    }).pipe(Effect.catch(() => Effect.succeed(Message.FailedStartGame()))),
})

export const UpdatePlayerProgress = Command.define('UpdatePlayerProgress', {
  args: {
    playerId: Schema.String,
    gameId: Schema.String,
    userGameText: Schema.String,
    charsTyped: Schema.Number,
  },
  messages: [Message.CompletedUpdatePlayerProgress],
  execute: ({ playerId, gameId, userGameText, charsTyped }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      yield* client.updatePlayerProgress({
        playerId,
        gameId,
        userText: userGameText,
        charsTyped,
      })
      return Message.CompletedUpdatePlayerProgress()
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(Message.CompletedUpdatePlayerProgress()),
      ),
    ),
})

export const CopyRoomId = Command.define('CopyRoomId', {
  args: { roomId: Schema.String },
  messages: [Message.SucceededCopyRoomId, Message.FailedCopyRoomId],
  execute: ({ roomId }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(roomId),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(Message.SucceededCopyRoomId()),
      Effect.catch(() => Effect.succeed(Message.FailedCopyRoomId())),
    ),
})

export const WaitForExitCountdownInterval = Command.define(
  'WaitForExitCountdownInterval',
  {
    messages: [Message.CompletedWaitForExitCountdownInterval],
    execute: Effect.sleep('1 second').pipe(
      Effect.as(Message.CompletedWaitForExitCountdownInterval()),
    ),
  },
)

const COPY_INDICATOR_DURATION = '2 seconds'

export const WaitBeforeHidingRoomIdCopiedIndicator = Command.define(
  'WaitBeforeHidingRoomIdCopiedIndicator',
  {
    messages: [Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator],
    execute: Effect.sleep(COPY_INDICATOR_DURATION).pipe(
      Effect.as(Message.CompletedWaitBeforeHidingRoomIdCopiedIndicator()),
    ),
  },
)

// SESSION COMMANDS

export const SavePlayerSession = Command.define('SavePlayerSession', {
  args: { session: RoomPlayerSession },
  messages: [Message.CompletedSavePlayerSession],
  execute: ({ session }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encodeSession = Schema.encodeEffect(RoomPlayerSessionJsonString)
      const sessionJson = yield* encodeSession(session)
      yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
      return Message.CompletedSavePlayerSession()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSavePlayerSession())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
})

export const ClearSession = Command.define('ClearSession', {
  messages: [Message.CompletedClearSession],
  execute: Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(ROOM_PLAYER_SESSION_KEY)
    return Message.CompletedClearSession()
  }).pipe(
    Effect.catch(() => Effect.succeed(Message.CompletedClearSession())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  ),
})

export const FocusRoomPageUsernameInput = Command.define(
  'FocusRoomPageUsernameInput',
  {
    messages: [Message.CompletedFocusRoomPageUsernameInput],
    execute: Dom.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusRoomPageUsernameInput()),
    ),
  },
)

export const FocusUserGameTextInput = Command.define('FocusUserGameTextInput', {
  messages: [Message.CompletedFocusUserGameTextInput],
  execute: Dom.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusUserGameTextInput()),
  ),
})
