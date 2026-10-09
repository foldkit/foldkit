import { Layer } from 'effect'

import { CommandsLive } from './command'
import { SubscriptionsLive } from './subscription'
import { NavigateHomeLive } from './update'

export const Live = Layer.mergeAll(
  CommandsLive,
  SubscriptionsLive,
  NavigateHomeLive,
)
