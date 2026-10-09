import { Effect, Layer, Schema } from 'effect'
import { Command, Dom } from 'foldkit'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import { RoomsClient } from '../../rpc'
import { Message } from './message'

export const CreateRoom = Command.define('CreateRoom', {
  args: { username: Schema.String },
  messages: [Message.SucceededCreateRoom, Message.FailedCreateRoom],
})

const CreateRoomLive = CreateRoom.toLayer(({ username }) =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return Message.SucceededCreateRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedCreateRoom({ error: String(error) })),
    ),
  ),
)

export const JoinRoomFromHome = Command.define('JoinRoomFromHome', {
  args: { username: Schema.String, roomId: Schema.String },
  messages: [Message.SucceededJoinRoomFromHome, Message.FailedJoinRoomFromHome],
})

const JoinRoomFromHomeLive = JoinRoomFromHome.toLayer(({ username, roomId }) =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return Message.SucceededJoinRoomFromHome({ roomId: room.id, player })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(Message.FailedJoinRoomFromHome({ error: String(error) })),
    ),
  ),
)

export const FocusUsernameInput = Command.define('FocusUsernameInput', {
  messages: [Message.CompletedFocusUsernameInput],
})

const FocusUsernameInputLive = FocusUsernameInput.toLayer(() =>
  Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusUsernameInput()),
  ),
)

export const FocusRoomIdInput = Command.define('FocusRoomIdInput', {
  messages: [Message.CompletedFocusRoomIdInput],
})

const FocusRoomIdInputLive = FocusRoomIdInput.toLayer(() =>
  Dom.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusRoomIdInput()),
  ),
)

export const CommandsLive = Layer.mergeAll(
  CreateRoomLive,
  JoinRoomFromHomeLive,
  FocusUsernameInputLive,
  FocusRoomIdInputLive,
)
