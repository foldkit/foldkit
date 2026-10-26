import { Layer } from 'effect'

import * as Command from './command'
import * as Subscription from './subscription'

export const EffectsLayer = Layer.mergeAll(
  Command.EffectsLayer,
  Subscription.subscriptions.layer,
)
