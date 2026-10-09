import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { NavigateToRoomLive } from './command'
import { Home, Room } from './page'
import { RoomsClientLive } from './rpc'
import { NavigationLive } from './update'

export const HandlersLive = Layer.mergeAll(
  NavigateToRoomLive,
  NavigationLive,
  Home.Live,
  Room.Live,
)

const ServicesLive = Layer.mergeAll(
  RoomsClientLive,
  BrowserKeyValueStore.layerSessionStorage,
)

export const Live = HandlersLive.pipe(Layer.provideMerge(ServicesLive))
