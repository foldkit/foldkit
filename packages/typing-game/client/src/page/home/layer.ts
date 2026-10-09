import { Layer } from 'effect'

import { CommandsLayer } from './command'
import { SubscriptionsLayer } from './subscription'

export const layer = Layer.mergeAll(CommandsLayer, SubscriptionsLayer)
