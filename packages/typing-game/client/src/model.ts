import { Schema } from 'effect'

import * as Home from './page/home'
import * as Room from './page/room'
import { ApplicationRoute } from './route'

export const RoomInstance = Schema.Struct({
  roomId: Schema.String,
  model: Room.RoomBlock.Model,
})
export type RoomInstance = typeof RoomInstance.Type

export const Model = Schema.Struct({
  route: ApplicationRoute,
  home: Home.HomeBlock.Model,
  maybeRoomInstance: Schema.Option(RoomInstance),
})
export type Model = typeof Model.Type
