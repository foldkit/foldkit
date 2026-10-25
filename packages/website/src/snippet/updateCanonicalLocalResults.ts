import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { CounterBlock } from './initResetCounter'

const Model = Schema.Struct({
  counter: CounterBlock.Model,
  revision: Schema.Number,
})
const Message = defineMessageUnion({
  ClickedResetCounter: {},
  ClickedIncrementRevision: {},
  CompletedSave: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const CounterBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counter',
  init: { contextToArgs: () => Tuple.make(0) },
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CounterBinding],
})

export const update = ApplicationComposition.makeUpdate({
  ClickedResetCounter: model => {
    if (model.counter.count === 0) {
      return ApplicationDefinition.makeNoopStep()(model)
    }

    return CounterBinding.requestReset()(model)
  },
  ClickedIncrementRevision: ApplicationDefinition.makeFieldsStep(() => ({
    revision: revision => revision + 1,
  })),
  CompletedSave: ApplicationDefinition.makeNoopStep(),
})
