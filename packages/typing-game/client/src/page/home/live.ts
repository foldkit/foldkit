import { Layer } from 'effect'

import { CommandsLive } from './command'
import { SubscriptionsLive } from './subscription'

export const Live = Layer.mergeAll(CommandsLive, SubscriptionsLive)
