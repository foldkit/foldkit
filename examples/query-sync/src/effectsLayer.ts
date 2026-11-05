import { Layer } from 'effect'

import { LoadExternal, NavigateInternal, ReplaceFilters } from './command'

export const EffectsLayer = Layer.mergeAll(
  ReplaceFilters.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
)
