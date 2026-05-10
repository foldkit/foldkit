import { Schema as S } from 'effect'
import { Subscription } from 'foldkit'

import { TickedFrame } from './message'
import type { Message } from './message'
import type { Model } from './model'

const SubscriptionDeps = S.Struct({
  frame: S.Boolean,
})

export const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  frame: Subscription.animationFrame({
    isActive: model => model.isRunning,
    toMessage: deltaTimeMs => TickedFrame({ deltaTimeMs }),
  }),
})
