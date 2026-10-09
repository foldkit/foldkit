import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { NavigateToRoomLayer } from './command'
import { Home, Room } from './page'
import { RoomsClientLayer } from './rpc'
import { NavigationLayer } from './update'

export const HandlersLayer = Layer.mergeAll(
  NavigateToRoomLayer,
  NavigationLayer,
  Home.layer,
  Room.layer,
)

const ServicesLayer = Layer.mergeAll(
  RoomsClientLayer,
  BrowserKeyValueStore.layerSessionStorage,
)

export const layer = HandlersLayer.pipe(Layer.provideMerge(ServicesLayer))
