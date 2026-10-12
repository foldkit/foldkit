import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { NavigateToRoom } from './command'
import { Home, Room } from './page'
import { RoomsClientLayer } from './rpc'
import { LoadExternal, NavigateInternal } from './update'

export const EffectsLayer = Layer.mergeAll(
  NavigateToRoom.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  Home.EffectsLayer,
  Room.EffectsLayer,
)

const ServicesLayer = Layer.mergeAll(
  RoomsClientLayer,
  BrowserKeyValueStore.layerSessionStorage,
)

export const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)
