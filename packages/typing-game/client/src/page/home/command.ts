import { Effect, Schema as S, Stream } from 'effect'
import { Command, Mount } from 'foldkit'

import { RoomsClient, RoomsClientLive } from '../../rpc.js'
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
    Effect.provide(RoomsClientLive),
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
    Effect.provide(RoomsClientLive),
  ),
)

export const FocusUsernameInput = Mount.define(
  'FocusUsernameInput',
  CompletedFocusUsernameInput,
)(element =>
  Stream.fromEffect(
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) {
        element.focus()
      }
      return CompletedFocusUsernameInput()
    }),
  ),
)

export const FocusRoomIdInput = Mount.define(
  'FocusRoomIdInput',
  CompletedFocusRoomIdInput,
)(element =>
  Stream.fromEffect(
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) {
        element.focus()
      }
      return CompletedFocusRoomIdInput()
    }),
  ),
)
