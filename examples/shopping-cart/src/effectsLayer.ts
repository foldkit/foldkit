import { Layer } from 'effect'

import { LoadExternal, NavigateInternal } from './command'

export const EffectsLayer = Layer.mergeAll(
  NavigateInternal.layer,
  LoadExternal.layer,
)
