import { Layer } from 'effect'

import { BrowserCrypto, BrowserKeyValueStore } from '@effect/platform-browser'
import { DragAndDrop } from '@foldkit/ui'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'

export const EffectsLayer = Layer.mergeAll(
  DragAndDrop.EffectsLayer,
  GenerateCardId.layer,
  SaveBoard.layer,
  FocusAddCardInput.layer,
)

const ServicesLayer = Layer.mergeAll(
  BrowserCrypto.layer,
  BrowserKeyValueStore.layerLocalStorage,
)

export const AppLayer = Layer.provideMerge(EffectsLayer, ServicesLayer)
