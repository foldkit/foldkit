import { Layer } from 'effect'

import { LoadExternal, NavigateInternal } from './command'
import { NavigateToRoom } from './composition'

export const EffectsLayer = Layer.mergeAll(
  NavigateInternal.layer,
  LoadExternal.layer,
  NavigateToRoom.layer,
)
