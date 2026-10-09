import { Layer } from 'effect'

import { CommandsLayer } from './command'
import { SubscriptionsLayer } from './subscription'
import { NavigateHomeLayer } from './update'

export const layer = Layer.mergeAll(
  CommandsLayer,
  SubscriptionsLayer,
  NavigateHomeLayer,
)
