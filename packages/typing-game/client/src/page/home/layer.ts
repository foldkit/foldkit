import { Layer as EffectLayer } from 'effect'

import { CommandsLayer } from './command'
import { SubscriptionsLayer } from './subscription'

export const Layer = EffectLayer.mergeAll(CommandsLayer, SubscriptionsLayer)
