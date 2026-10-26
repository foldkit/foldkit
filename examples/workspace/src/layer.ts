import { Layer } from 'effect'

import * as Command from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Command.EffectsLayer,
  subscriptions.layer,
)
