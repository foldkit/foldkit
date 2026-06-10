import { Effect, Match as M, Schema as S } from 'effect'
import { Dom } from 'foldkit'
import { ts } from 'foldkit/schema'

import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../constant'
import { RoomsClient } from '../../rpc.js'
import {
  CompletedFocusRoomIdInput,
  CompletedFocusUsernameInput,
  FailedJoinRoom,
  Message,
  SucceededCreateRoom,
  SucceededJoinRoom,
} from './message'

export const CreateRoom = ts('CreateRoom', { username: S.String })
export const JoinRoom = ts('JoinRoom', {
  username: S.String,
  roomId: S.String,
})
export const FocusUsernameInput = ts('FocusUsernameInput')
export const FocusRoomIdInput = ts('FocusRoomIdInput')

export const Command = S.Union([
  CreateRoom,
  JoinRoom,
  FocusUsernameInput,
  FocusRoomIdInput,
])
export type Command = typeof Command.Type

export const execute = (
  command: Command,
): Effect.Effect<Message, never, RoomsClient> =>
  M.value(command).pipe(
    M.tagsExhaustive({
      CreateRoom: ({ username }) =>
        Effect.gen(function* () {
          const client = yield* RoomsClient
          const { player, room } = yield* client.createRoom({ username })
          return SucceededCreateRoom({ roomId: room.id, player })
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(FailedJoinRoom({ error: String(error) })),
          ),
        ),

      JoinRoom: ({ username, roomId }) =>
        Effect.gen(function* () {
          const client = yield* RoomsClient
          const { player, room } = yield* client.joinRoom({ username, roomId })
          return SucceededJoinRoom({ roomId: room.id, player })
        }).pipe(
          Effect.catch(error =>
            Effect.succeed(FailedJoinRoom({ error: String(error) })),
          ),
        ),

      FocusUsernameInput: () =>
        Dom.focus(`#${USERNAME_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(CompletedFocusUsernameInput()),
        ),

      FocusRoomIdInput: () =>
        Dom.focus(`#${ROOM_ID_INPUT_ID}`).pipe(
          Effect.ignore,
          Effect.as(CompletedFocusRoomIdInput()),
        ),
    }),
  )
