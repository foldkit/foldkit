import { Layer } from 'effect'

import { CommandsLayer } from './command'
import { SubscriptionsLayer } from './subscription'

export const EffectsLayer = Layer.mergeAll(CommandsLayer, SubscriptionsLayer)
