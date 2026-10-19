import { Option } from 'effect'
import { Subscription } from 'foldkit'

import { Message } from './message'
import type { Model } from './model'
import * as SignedIn from './signedIn'

const readSignedIn = (model: Model) =>
  Option.liftPredicate(model, model => model._tag === 'SignedIn')

const signedInSubscriptions = Subscription.lift(SignedIn.subscriptions)<
  Model,
  Message
>({
  read: readSignedIn,
  toParentMessage: message => Message.GotSignedInMessage({ message }),
})

export const subscriptions = Subscription.aggregate(signedInSubscriptions)
