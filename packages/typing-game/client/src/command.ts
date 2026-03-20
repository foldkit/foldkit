import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { ROOM_PLAYER_SESSION_KEY } from './constant'
import {
  CompletedClearSession,
  CompletedNavigateRoom,
  CompletedSaveSession,
} from './message'
import { Home, Room } from './page'
import { roomRouter } from './route'
import { RoomsClient } from './rpc'

const JoinRoom = Command.define('JoinRoom')
const NavigateToRoom = Command.define('NavigateToRoom')
const SavePlayerSession = Command.define('SavePlayerSession')
const ClearSession = Command.define('ClearSession')

export const joinRoom = (username: string, roomId: string) =>
  JoinRoom(
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player, room } = yield* client.joinRoom({ username, roomId })
      return Home.Message.JoinedRoom({ roomId: room.id, player })
    }).pipe(
      Effect.catchAll(error =>
        Effect.succeed(Home.Message.FailedEnterRoom({ error: String(error) })),
      ),
      Effect.provide(RoomsClient.Default),
    ),
  )

export const navigateToRoom = (roomId: string) =>
  NavigateToRoom(
    pushUrl(roomRouter({ roomId })).pipe(Effect.as(CompletedNavigateRoom())),
  )

export const savePlayerSession = (session: Room.Model.RoomPlayerSession) =>
  SavePlayerSession(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encodeSession = S.encode(S.parseJson(Room.Model.RoomPlayerSession))
      const sessionJson = yield* encodeSession(session)
      yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
      return CompletedSaveSession()
    }).pipe(
      Effect.catchAll(() => Effect.succeed(CompletedSaveSession())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
  )

export const clearSession = () =>
  ClearSession(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.remove(ROOM_PLAYER_SESSION_KEY)
      return CompletedClearSession()
    }).pipe(
      Effect.catchAll(() => Effect.succeed(CompletedClearSession())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
  )
