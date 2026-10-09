import { Layer as EffectLayer } from 'effect'

import { CommandsLayer } from './command'
import { SubscriptionsLayer } from './subscription'
import { NavigateHomeLayer } from './update'

export const Layer = EffectLayer.mergeAll(
  CommandsLayer,
  SubscriptionsLayer,
  NavigateHomeLayer,
)
