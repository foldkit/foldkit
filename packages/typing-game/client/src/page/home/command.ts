import { Effect, Schema } from 'effect'
import { Command, Dom } from 'foldkit'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import { RoomsClient } from '../../rpc'
import { Message } from './message'

export const CreateRoom = Command.define('CreateRoom', {
  args: { username: Schema.String },
  messages: [Message.SucceededCreateRoom, Message.FailedCreateRoom],
  handler: function* () {
    const client = yield* RoomsClient

    return ({ username }) =>
      client.createRoom({ username }).pipe(
        Effect.map(({ player, room }) =>
          Message.SucceededCreateRoom({ roomId: room.id, player }),
        ),
        Effect.catch(error =>
          Effect.succeed(Message.FailedCreateRoom({ error: String(error) })),
        ),
      )
  },
})

export const JoinRoomFromHome = Command.define('JoinRoomFromHome', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoomFromHome, Message.FailedJoinRoomFromHome],
  handler: function* () {
    const client = yield* RoomsClient

    return ({ username, roomId }) =>
      client.joinRoom({ username, roomId }).pipe(
        Effect.map(({ player, room }) =>
          Message.SucceededJoinRoomFromHome({ roomId: room.id, player }),
        ),
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedJoinRoomFromHome({ error: String(error) }),
          ),
        ),
      )
  },
})

export const FocusUsernameInput = Command.define('FocusUsernameInput', {
  messages: [Message.CompletedFocusUsernameInput],
  handler: function* () {
    return () =>
      Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusUsernameInput()),
      )
  },
})

export const FocusRoomIdInput = Command.define('FocusRoomIdInput', {
  messages: [Message.CompletedFocusRoomIdInput],
  handler: function* () {
    return () =>
      Dom.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedFocusRoomIdInput()),
      )
  },
})
