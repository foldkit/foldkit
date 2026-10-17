import { Schema } from 'effect'

import { Home, Room } from './page'
import { ApplicationRoute } from './route'

export const RoomInstance = Schema.Struct({
  roomId: Schema.String,
  model: Room.Model,
})
export type RoomInstance = typeof RoomInstance.Type

export const Model = Schema.Struct({
  route: ApplicationRoute,
  home: Home.Model,
  maybeRoomInstance: Schema.Option(RoomInstance),
})
export type Model = typeof Model.Type
