import { Layer } from 'effect'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'

export const ApplicationLayer = Layer.mergeAll(
  BrowserCrypto.layerSecureRandom,
  BrowserKeyValueStore.layerLocalStorage,
)
