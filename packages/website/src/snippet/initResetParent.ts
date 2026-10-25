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
const Message = defineMessageUnion({
  ClickedReset: {},
  ClickedRestoreBaseline: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const CounterBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counter',
  init: { contextToArgs: () => [0] },
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CounterBinding],
})

const clearDraft = ApplicationDefinition.makeFieldsStep(() => ({
  draft: () => '',
}))
const reset = Update.combineSteps([clearDraft, CounterBinding.requestReset()])
const restoreBaseline = ApplicationDefinition.makeStep(model =>
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
