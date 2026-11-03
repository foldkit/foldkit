import { Effect, Schema } from 'effect'

import * as Block from '../../../packages/foldkit/src/block/public.js'
import { defineMessageUnion } from '../../../packages/foldkit/src/message/index.js'
import * as Update from '../../../packages/foldkit/src/update/index.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ClickedIncrement: {},
  CompletedRecord: {},
})
const Key = Symbol('AfterInference')
const Definition = Block.makeDefinition('AfterInference', {
  key: Key,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const Composition = Definition.makeComposition()
const base = Composition.makeUpdate({
  ClickedIncrement: Definition.makeNoopStep(),
  CompletedRecord: Definition.makeNoopStep(),
})
const RecordCount = Definition.makeCommand('RecordCount', {
  messages: [Message.CompletedRecord],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRecord())
  },
})
const extracted = (before: Model) =>
  Definition.makeFieldsStep(() => ({ count: () => before.count }))
export const fields = Composition.makeUpdate.withAfter(base, before =>
  Definition.makeFieldsStep(() => ({ count: () => before.count })),
)
export const commands = Composition.makeUpdate.withAfter(base, () =>
  Definition.makeCommandsStep(() => [RecordCount()]),
)
export const combined = Composition.makeUpdate.withAfter(base, before =>
  Update.combineSteps([extracted(before), extracted(before)]),
)
export const raw = Composition.makeUpdate.withAfter(base, before => model => ({
  model: { count: model.count + before.count },
}))
export const general = Composition.makeUpdate.withAfter(base, before =>
  Definition.makeStep(model => ({
    model: { count: model.count + before.count },
  })),
)
export const named = Composition.makeUpdate.withAfter(base, extracted)
export const called = Composition.makeUpdate.withAfter(base, before =>
  extracted(before),
)
