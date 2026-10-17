import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import { RoomsClientLayer } from './rpc'

export const ApplicationLayer = Layer.mergeAll(
  RoomsClientLayer,
  BrowserKeyValueStore.layerSessionStorage,
)
