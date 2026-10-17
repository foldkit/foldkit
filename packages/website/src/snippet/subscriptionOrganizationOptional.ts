import { Option } from 'effect'

import { Application } from './definition'
import { Message } from './message'
import type { Model } from './model'
import * as SignedIn from './signedIn'

const readSignedIn = (model: Model) =>
  Option.liftPredicate(model, model => model._tag === 'SignedIn')

export const SignedInBinding = Application.bindChild(SignedIn.block, {
  read: readSignedIn,
  write: (model, nextSignedIn) => nextSignedIn,
  parentMessage: Message.GotSignedInMessage,
  fromParentMessage: {
    parentMessage: Message.GotSignedInMessage,
    args: (_model, { message }) => Option.some([message]),
  },
})
