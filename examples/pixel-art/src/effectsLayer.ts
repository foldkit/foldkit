import { Layer } from 'effect'

import { ExportPng, SaveCanvas } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  SaveCanvas.layer,
  ExportPng.layer,
  subscriptions.layer,
)
