import { Layer } from 'effect'

import * as Command from './command'
import { NavigateToRoom } from './composition'

export const EffectsLayer = Layer.mergeAll(
  Command.EffectsLayer,
  NavigateToRoom.layer,
)
