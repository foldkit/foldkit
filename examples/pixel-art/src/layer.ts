import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import * as UI from '@foldkit/ui'

import { ExportPng, SaveCanvas } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  UI.EffectsLayer,
  SaveCanvas.layer,
  ExportPng.layer,
  subscriptions.undoRedoKeyPresses.layer,
  subscriptions.toolKeyPresses.layer,
  subscriptions.mouseReleases.layer,
)

export const AppLayer = Layer.provideMerge(
  EffectsLayer,
  BrowserKeyValueStore.layerLocalStorage,
)
