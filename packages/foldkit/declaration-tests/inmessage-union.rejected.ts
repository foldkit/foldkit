import { Schema } from 'effect'
import type * as Block from 'foldkit/block'
import { defineInMessageUnion } from 'foldkit/message'

import {
  InMessage,
  InputBinding,
  InputContract,
  Model,
} from './inmessage-union.accepted.js'

defineInMessageUnion({
  RequestedSave: {},
  // @ts-expect-error Invalid tags are rejected at the offending property.
  ClickedSave: {},
  InformedOfStatus: {},
})

defineInMessageUnion({
  // @ts-expect-error Requested requires a nonempty generated operation name.
  Requested: {},
})

defineInMessageUnion({
  // @ts-expect-error InformedOf requires a nonempty generated operation name.
  InformedOf: {},
})

defineInMessageUnion({
  // @ts-expect-error No additional InMessage prefix family is accepted.
  ReceivedStatus: { status: Schema.String },
})

const invalidExtractedCases = {
  RequestedSave: {},
  ClickedSave: {},
}
// @ts-expect-error Extracted case records retain validation of every literal key.
defineInMessageUnion(invalidExtractedCases)

// @ts-expect-error Payload constructors retain the declared field type.
InMessage.RequestedSet({ count: '2' })
// @ts-expect-error Generated Binding methods retain the InMessage payload.
InputBinding.requestSet({ count: '2' })
// @ts-expect-error Generated Binding methods use informOfReset, not the former informReset spelling.
InputBinding.informReset()
// @ts-expect-error Generated Binding methods use informOfReset, not informedOfReset.
InputBinding.informedOfReset()
declare const input: Block.ExecutableOf<typeof InputContract>
// @ts-expect-error The generated method is requestSet, not requestedSet.
input.operations.requestedSet
// @ts-expect-error The generated method is informOfReset, not the former informReset spelling.
input.operations.informReset
// @ts-expect-error The generated method is informOfReset, not informedOfReset.
input.operations.informedOfReset
// @ts-expect-error Generated request operations retain their payload.
input.operations.requestSet(Model.make({ count: 0 }), { count: '2' })
