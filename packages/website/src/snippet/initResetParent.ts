import { Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { CounterBlock } from './initResetCounter'

const Model = Schema.Struct({
  applicationId: Schema.String,
  draft: Schema.String,
  counter: CounterBlock.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedReset: {},
  ClickedRestoreBaseline: {},
})
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeStep, makeFieldsStep } = ApplicationDefinition

const CounterBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counter',
  init: { contextToArgs: () => [0] },
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CounterBinding],
})

const clearDraft = makeFieldsStep(() => ({
  draft: () => '',
}))
const reset = Update.combineSteps([clearDraft, CounterBinding.requestReset()])
const restoreBaseline = makeStep(model =>
  CounterBinding.init({
    args: [0],
    toParentModel: counter =>
      modifyFields(model, {
        draft: () => '',
        counter: () => counter,
      }),
  }),
)

export const init = ApplicationComposition.makeInit(
  (applicationId: string) => ({
    model: { applicationId, draft: '' },
  }),
)
export const update = ApplicationComposition.makeUpdate({
  ClickedReset: reset,
  ClickedRestoreBaseline: restoreBaseline,
})
