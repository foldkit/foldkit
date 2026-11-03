import { Effect, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'

import {
  ChildBinding,
  Definition,
  ParentDefinition,
  init,
  update,
  view,
} from './basic'

export const OtherChildKey = Symbol('OtherChild')
export const OtherParentKey = Symbol('OtherParent')

const OtherChildDefinition = Contracted.makeDefinition('ContractProof', {
  key: OtherChildKey,
  Model: Definition.Model,
  Message: Definition.Message,
  OutMessage: Definition.OutMessage,
  Init: Schema.Tuple([Schema.String]),
  view: { kind: 'Element' },
  operations: {
    clear: Definition.Message.RequestedClear,
    submit: {
      message: Definition.Message.SubmittedText,
      outMessage: Definition.OutMessage.Submitted,
    },
  },
})

// @ts-expect-error Identical names and canonical Schemas do not authorize foreign plans.
OtherChildDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, view }),
)

const OtherParentDefinition = Contracted.makeDefinition('ContractProofParent', {
  key: OtherParentKey,
  Model: ParentDefinition.Model,
  Message: ParentDefinition.Message,
  Init: Schema.Tuple([]),
})

// @ts-expect-error A same-shaped parent cannot register another declaration's Binding.
OtherParentDefinition.makeComposition({ bindings: [ChildBinding] })

export const rejectBroadKey = (key: symbol) => {
  // @ts-expect-error A broad symbol does not establish one static declaration identity.
  Contracted.makeDefinition('BroadKeyProof', {
    key,
    Model: Definition.Model,
    Message: Definition.Message,
    Init: Schema.Tuple([]),
  })
}

export const rejectUnionKey = (
  key: typeof OtherChildKey | typeof OtherParentKey,
) => {
  // @ts-expect-error One contract cannot have alternative declaration identities.
  Contracted.makeDefinition('UnionKeyProof', {
    key,
    Model: Definition.Model,
    Message: Definition.Message,
    Init: Schema.Tuple([]),
  })
}
