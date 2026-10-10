import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { NavigateToRoomLayer } from './command'
import { Home, Room } from './page'
import { RoomsClientLayer } from './rpc'
import { NavigationLayer } from './update'

export const EffectsLayer = Layer.mergeAll(
  NavigateToRoomLayer,
  NavigationLayer,
  Home.EffectsLayer,
  Room.EffectsLayer,
)

const ServicesLayer = Layer.mergeAll(
  RoomsClientLayer,
  BrowserKeyValueStore.layerSessionStorage,
)

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
