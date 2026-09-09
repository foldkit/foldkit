import { Schema } from 'effect'

import { Home, Room } from './page'
import { AppRoute } from './route'

export const Model = Schema.Struct({
  route: AppRoute,
  home: Home.Model.Model,
  room: Room.Model.Model,
})
export type Model = typeof Model.Type
