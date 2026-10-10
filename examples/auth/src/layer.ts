import { Layer } from 'effect'

import { CommandsLayer } from './command'
import { LoggedOut } from './page'

export const EffectsLayer = Layer.mergeAll(
  CommandsLayer,
  LoggedOut.EffectsLayer,
)
