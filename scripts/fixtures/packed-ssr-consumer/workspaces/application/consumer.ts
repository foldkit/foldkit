import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { withBlock } from 'foldkit/story'

import { Model } from '@fixture/shared-model'

const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
})
type Message = typeof Message.Type

export const WorkspaceConsumerKey = Symbol('WorkspaceConsumer')
export const WorkspaceConsumerBlock = Block.make('WorkspaceConsumer', {
  key: WorkspaceConsumerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
const WorkspaceConsumerComposition = WorkspaceConsumerBlock.makeComposition()
const { makeFieldsStep } = WorkspaceConsumerBlock

const init = WorkspaceConsumerComposition.makeInit(() => ({
  model: Model.make({ title: 'Before' }),
}))

export const update = WorkspaceConsumerComposition.makeUpdate({
  UpdatedTitle: makeFieldsStep.fromMessage(({ value }) => ({
    title: () => value,
  })),
})

export const layer = WorkspaceConsumerBlock.makeLayer({
  init,
  update,
})

await Effect.runPromise(
  withBlock({ block: WorkspaceConsumerBlock, layer }, consumer => {
    const initialized = consumer.init()
    const changedTitle = consumer.update(
      initialized.model,
      Message.UpdatedTitle({ value: 'After' }),
    )

    if (changedTitle.model.title !== 'After') {
      throw new Error('The workspace consumer did not update the shared Model')
    }
  }),
)

console.log('The npm workspace consumer updates its shared Model')
