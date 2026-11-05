import { Layer } from 'effect'

import { LoadExternal, NavigateInternal } from './command'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  NavigateInternal.layer,
  LoadExternal.layer,
  subscriptions.layer,
)
