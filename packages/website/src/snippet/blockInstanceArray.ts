import { Array, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { CounterBlock } from './initResetCounter'

export const Model = Schema.Struct({
  counters: Schema.Array(CounterBlock.Instance),
  nextCounterId: Schema.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedAddCounter: {},
  ClickedAddAndResetCounter: {},
  ClickedRemoveCounter: { key: Schema.String },
})
export type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

export const {
  makeFieldsStep,
  makeStep,
  makeKeyedArrayBinding,
  makeComposition,
} = ApplicationBlock

export const CountersBinding = makeKeyedArrayBinding(CounterBlock, {
  field: 'counters',
  key: 'key',
  childField: 'model',
})

export const ApplicationComposition = makeComposition({
  bindings: [CountersBinding],
})

export const addCounter = makeFieldsStep(model => ({
  counters: Array.append(
    CountersBinding.create({
      key: `counter-${model.nextCounterId}`,
      args: [model.nextCounterId],
    }),
  ),
  nextCounterId: Number.increment,
}))
