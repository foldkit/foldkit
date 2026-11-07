import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { CounterBlock } from './initResetCounter'

const Model = Schema.Struct({
  counter: CounterBlock.Model,
  revision: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedResetCounter: {},
  ClickedIncrementRevision: {},
  CompletedSave: {},
})
type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const {
  makeFieldsStep,
  makeNoopStep,
  makeRequiredFieldBinding,
  makeComposition,
} = ApplicationBlock

const CounterBinding = makeRequiredFieldBinding(CounterBlock, {
  field: 'counter',
  init: { contextToArgs: () => [0] },
})
const ApplicationComposition = makeComposition({
  bindings: [CounterBinding],
})

export const update = ApplicationComposition.makeUpdate({
  ClickedResetCounter: model => {
    if (model.counter.count === 0) {
      return makeNoopStep()(model)
    }

    return CounterBinding.requestReset()(model)
  },
  ClickedIncrementRevision: makeFieldsStep(() => ({
    revision: revision => revision + 1,
  })),
  CompletedSave: makeNoopStep(),
})
