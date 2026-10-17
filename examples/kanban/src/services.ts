import { Layer } from 'effect'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

export const ApplicationLayer = Layer.mergeAll(
  BrowserCrypto.layer,
  BrowserKeyValueStore.layerLocalStorage,
)
