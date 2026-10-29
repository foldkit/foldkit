import { Schema, Tuple } from 'effect'
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

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = ApplicationDefinition

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
      return makeNoopStep()(model)
    }

    return CounterBinding.requestReset()(model)
  },
  ClickedIncrementRevision: makeFieldsStep(() => ({
    revision: revision => revision + 1,
  })),
  CompletedSave: makeNoopStep(),
})
