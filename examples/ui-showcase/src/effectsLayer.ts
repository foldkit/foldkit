import { Layer } from 'effect'

import { LoadExternal, NavigateInternal } from './command'

export const EffectsLayer = Layer.merge(
  NavigateInternal.layer,
  LoadExternal.layer,
)
