import { Effect, Layer, Schema } from 'effect'
import { Command, Dom } from 'foldkit'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import { RoomsClient } from '../../rpc'
import { Message } from './message'

export const CreateRoom = Command.define('CreateRoom', {
  args: { username: Schema.String },
  messages: [Message.SucceededCreateRoom, Message.FailedCreateRoom],
})

const CreateRoomLayer = CreateRoom.toLayer(
  Effect.gen(function* () {
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
  }),
)

export const JoinRoomFromHome = Command.define('JoinRoomFromHome', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoomFromHome, Message.FailedJoinRoomFromHome],
})

const JoinRoomFromHomeLayer = JoinRoomFromHome.toLayer(
  Effect.gen(function* () {
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
  }),
)

export const FocusUsernameInput = Command.define('FocusUsernameInput', {
  messages: [Message.CompletedFocusUsernameInput],
})

const FocusUsernameInputLayer = FocusUsernameInput.toLayer(
  Effect.succeed(() =>
    Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusUsernameInput()),
    ),
  ),
)

export const FocusRoomIdInput = Command.define('FocusRoomIdInput', {
  messages: [Message.CompletedFocusRoomIdInput],
})

const FocusRoomIdInputLayer = FocusRoomIdInput.toLayer(
  Effect.succeed(() =>
    Dom.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusRoomIdInput()),
    ),
  ),
)

export const CommandsLayer = Layer.mergeAll(
  CreateRoomLayer,
  JoinRoomFromHomeLayer,
  FocusUsernameInputLayer,
  FocusRoomIdInputLayer,
)
