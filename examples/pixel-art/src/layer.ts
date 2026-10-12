import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Dialog, Listbox, RadioGroup } from '@foldkit/ui'

import { ExportPng, SaveCanvas } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Dialog.EffectsLayer,
  Listbox.EffectsLayer,
  RadioGroup.EffectsLayer,
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
