import { Stream } from 'effect'
import * as Subscription from 'foldkit/subscription'

import {
  DeclarationSubscriptionRegistryDefinition,
  Message,
  Model,
  mixedSubscriptions,
} from './subscription-registry.accepted.js'

// @ts-expect-error Mixed attached and host-owned subscriptions have no aggregate layer.
mixedSubscriptions.layer

DeclarationSubscriptionRegistryDefinition.makeSubscriptions(entry => ({
  // @ts-expect-error Definition.makeSubscriptions reserves layer for its aggregate Layer.
  layer: entry('Conflicting', {
    messages: [Message.Ticked],
    handler: function* () {
      return () => Stream.empty
    },
  }),
}))

DeclarationSubscriptionRegistryDefinition.makeSubscriptions(entry => {
  entry('Count', {
    messages: [Message.Ticked],
    // @ts-expect-error Entry gates must return booleans.
    when: model => model.count,
  })

  return {}
})

DeclarationSubscriptionRegistryDefinition.makeSubscriptions(entry => ({
  unknownField: entry('UnknownField', {
    messages: [Message.Ticked],
    // @ts-expect-error Entry gates receive the owning Block's Model.
    when: model => model.missing > 0,
  }),
}))

Subscription.make<typeof Model.Type, typeof Message.Type>()(entry => ({
  // @ts-expect-error Low-level entry gates also require booleans.
  count: entry('InvalidGate', { messages: [Message.Ticked], when: () => 1 }),
}))
