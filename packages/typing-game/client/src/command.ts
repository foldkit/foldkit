import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { ROOM_PLAYER_SESSION_KEY } from './constant'
import {
  CompletedRoomNavigation,
  CompletedSessionClear,
  CompletedSessionSave,
} from './message'
import { Home, Room } from './page'
import { roomRouter } from './route'
import { RoomsClient } from './rpc'

export const joinRoom = (
  username: string,
  roomId: string,
): Command.Command<
  typeof Home.Message.JoinedRoom | typeof Home.Message.FailedRoom
> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.joinRoom({ username, roomId })
    return Home.Message.JoinedRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(Home.Message.FailedRoom({ error: String(error) })),
    ),
    Effect.provide(RoomsClient.Default),
    Command.make('JoinRoom'),
  )

export const navigateToRoom = (
  roomId: string,
): Command.Command<typeof CompletedRoomNavigation> =>
  pushUrl(roomRouter({ roomId })).pipe(
    Effect.as(CompletedRoomNavigation()),
    Command.make('NavigateToRoom'),
  )

export const savePlayerSession = (
  session: Room.Model.RoomPlayerSession,
): Command.Command<typeof CompletedSessionSave> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const encodeSession = S.encode(S.parseJson(Room.Model.RoomPlayerSession))
    const sessionJson = yield* encodeSession(session)
    yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
    return CompletedSessionSave()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(CompletedSessionSave())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    Command.make('SavePlayerSession'),
  )

export const clearSession = (): Command.Command<typeof CompletedSessionClear> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(ROOM_PLAYER_SESSION_KEY)
    return CompletedSessionClear()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(CompletedSessionClear())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    Command.make('ClearSession'),
  )
