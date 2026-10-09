import { Layer } from 'effect'

import { NavigateToRoomLive } from './command'
import { Home, Room } from './page'
import { RoomsClientLive } from './rpc'
import { NavigationLive } from './update'

export const Live = Layer.mergeAll(
  NavigateToRoomLive,
  NavigationLive,
  Home.Live,
  Room.Live,
).pipe(Layer.provide(RoomsClientLive))
