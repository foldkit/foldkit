import { Effect, Schema as S } from 'effect'
import { Command, Dom } from 'foldkit'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import { RoomsClient } from '../../rpc'
import {
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  FailedJoinRoom,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from './message'

export const CreateRoom = Command.define(
  'CreateRoom',
  { username: S.String },
  SucceededCreateRoom,
  FailedJoinRoom,
)(({ username }) =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return SucceededCreateRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(FailedJoinRoom({ error: String(error) })),
    ),
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
    Effect.catch(error =>
      Effect.succeed(FailedJoinRoom({ error: String(error) })),
    ),
  ),
)

export const FocusUsernameInput = Command.define(
  'FocusUsernameInput',
  CompletedFocusUsernameInput,
)(
  Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusUsernameInput()),
  ),
)

export const FocusRoomIdInput = Command.define(
  'FocusRoomIdInput',
  CompletedFocusRoomIdInput,
)(
  Dom.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusRoomIdInput()),
  ),
)
