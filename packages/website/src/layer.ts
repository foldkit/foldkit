import { Layer } from 'effect'

import * as Command from './command'
import { LoadPlayground } from './composition'
import * as Subscription from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Command.EffectsLayer,
  LoadPlayground.layer,
  Subscription.EffectsLayer,
)
