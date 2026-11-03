import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Model } from '@fixture/shared-model'

const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
})
type Message = typeof Message.Type

export const WorkspaceConsumerKey = Symbol('WorkspaceConsumer')
const WorkspaceConsumerDefinition = Block.makeDefinition('WorkspaceConsumer', {
  key: WorkspaceConsumerKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const WorkspaceConsumerComposition =
  WorkspaceConsumerDefinition.makeComposition()
const { makeFieldsStep } = WorkspaceConsumerDefinition

const init = WorkspaceConsumerComposition.makeInit(() => ({
  model: Model.make({ title: 'Before' }),
}))

export const update = WorkspaceConsumerComposition.makeUpdate({
  UpdatedTitle: makeFieldsStep.fromMessage(({ value }) => ({
    title: () => value,
  })),
})

export const WorkspaceConsumerBlock = WorkspaceConsumerDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update }
  }),
)

await Effect.runPromise(
  Effect.gen(function* () {
    const consumer = yield* WorkspaceConsumerBlock.get
    const initialized = consumer.init()
    const changedTitle = consumer.update(
      initialized.model,
      Message.UpdatedTitle({ value: 'After' }),
    )

    if (changedTitle.model.title !== 'After') {
      throw new Error('The workspace consumer did not update the shared Model')
    }
  }).pipe(Effect.provide(WorkspaceConsumerBlock.layer), Effect.scoped),
)

console.log('The npm workspace consumer updates its shared Model')
