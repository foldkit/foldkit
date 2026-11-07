import { Option } from 'effect'

import { makeCustomBinding } from './block'
import type { Model } from './model'
import * as SignedIn from './signedIn'

const readSignedIn = (model: Model) =>
  Option.liftPredicate(model, model => model._tag === 'SignedIn')

export const SignedInBinding = makeCustomBinding(SignedIn.SignedInBlock, {
  read: readSignedIn,
  write: (model, nextSignedIn) => nextSignedIn,
})
