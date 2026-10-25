import { Layer, Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import {
  ChildBlock,
  Choice,
  EntryBinding,
  Message,
  Model,
  OperationConstructorProofChildComposition,
  OperationConstructorProofChildDefinition,
  OperationConstructorProofParentComposition,
  ParentBlock,
  ParentMessage,
  RecordValue,
  update,
  updateValue,
} from './operation-constructor.accepted.js'

const model = Model.make({ value: '' })

// @ts-expect-error An empty constructor operation takes no payload argument.
ChildBlock.operations.resetValue(model, {}, { prefix: 'invalid' })

// @ts-expect-error A nonempty constructor operation requires one payload object.
ChildBlock.operations.updateValue(model, { prefix: 'invalid' })

ChildBlock.operations.updateValue(
  model,
  // @ts-expect-error Constructor payload fields retain their exact input types.
  { value: 1 },
  { prefix: 'invalid' },
)

ChildBlock.operations.updateValue(
  model,
  { value: 'next' },
  // @ts-expect-error Required update Context follows the constructor payload.
  { source: 'invalid' },
)

ChildBlock.operations.updateValue(
  model,
  { value: 'next' },
  { prefix: 'invalid' },
  undefined,
  // @ts-expect-error Defaulted update Context keeps its declared type.
  1,
)

// @ts-expect-error Keyed Binding operations require the key first.
EntryBinding.updateValue({ value: 'next' }, { prefix: 'invalid' })

EntryBinding.updateValue(
  // @ts-expect-error The keyed Binding retains the exact key type.
  1,
  { value: 'next' },
  { prefix: 'invalid' },
)

Choice.operations.select(
  Choice.Model.make({ selected: 'First' }),
  // @ts-expect-error Generic constructor payloads retain their refinement.
  { value: 'Third' },
)

Choice.operations.selectPositionally(
  Choice.Model.make({ selected: 'First' }),
  // @ts-expect-error Custom positional producers remain refined too.
  'Third',
)

const ForeignMessage = defineMessageUnion({ UpdatedForeignValue: {} })
OperationConstructorProofChildComposition.prepareBlock({
  init: () => ({ model }),
  update,
  operations: {
    // @ts-expect-error Operations accept only constructors from the local Message Schema.
    updateValue: ForeignMessage.UpdatedForeignValue,
  },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

OperationConstructorProofParentComposition.prepareBlock({
  init: ParentBlock.init,
  update: ParentBlock.update,
  operations: {
    // @ts-expect-error Got* child wrappers are routed facts, not authored operations.
    gotChildMessage: ParentMessage.GotChildMessage,
  },
  EffectsLayer: Layer.empty,
})

const plainTaggedStruct = Schema.TaggedStruct('UpdatedValue', {
  value: Schema.String,
})
OperationConstructorProofChildComposition.prepareBlock({
  init: () => ({ model }),
  update,
  operations: {
    // @ts-expect-error Operations require a Foldkit callable Message constructor or tuple producer.
    plainTaggedStruct,
  },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

// @ts-expect-error Operation names cannot collide with reserved Block or Binding members.
OperationConstructorProofChildComposition.prepareBlock({
  init: () => ({ model }),
  update,
  operations: { fold: updateValue },
  EffectsLayer: Layer.empty,
  hostHandlers: [RecordValue],
})

// @ts-expect-error The completed Block has no legacy expose alias.
ChildBlock.expose

// @ts-expect-error Definitions do not expose the retired makeOperation helper.
OperationConstructorProofChildDefinition.makeOperation(Message.ResetValue)

// @ts-expect-error Compositions do not expose the retired makeOperation helper.
OperationConstructorProofChildComposition.makeOperation(Message.ResetValue)
