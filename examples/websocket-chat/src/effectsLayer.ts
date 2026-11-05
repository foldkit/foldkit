import { Layer } from 'effect'

import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from './command'
import { managedResources } from './managedResource'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.mergeAll(
  TimestampSentMessage.layer,
  TimestampReceivedMessage.layer,
  SendMessage.layer,
  managedResources.layer,
  subscriptions.layer,
)
