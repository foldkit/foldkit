import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Model } from '@fixture/shared-model'

const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
})
type Message = typeof Message.Type

const WorkspaceConsumerDefinition = Block.makeDefinition('WorkspaceConsumer', {
  Model,
  Message,
})
const WorkspaceConsumerComposition =
  WorkspaceConsumerDefinition.makeComposition()
const { makeFieldsStep } = WorkspaceConsumerDefinition

export const update = WorkspaceConsumerComposition.makeUpdate({
  UpdatedTitle: makeFieldsStep.fromMessage(({ value }) => ({
    title: () => value,
  })),
})

const model = Model.make({ title: 'Before' })
const changedTitle = update(model, Message.UpdatedTitle({ value: 'After' }))

if (changedTitle.model.title !== 'After') {
  throw new Error('The workspace consumer did not update the shared Model')
}

console.log('The npm workspace consumer updates its shared Model')
