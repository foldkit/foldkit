import { Option } from 'effect'

import { ApplicationBlock } from './definition'
import type { Model } from './model'
import * as SignedIn from './signedIn'

const readSignedIn = (model: Model) =>
  Option.liftPredicate(model, model => model._tag === 'SignedIn')

export const SignedInBinding = ApplicationBlock.makeBinding(
  SignedIn.SignedInBlock,
  {
    read: readSignedIn,
    write: (model, nextSignedIn) => nextSignedIn,
  },
)
