import { Array, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({
  board: orderBoardQuery.Model,
  pendingIntentIds: Schema.Array(Schema.String),
})

const Message = defineMessageUnion({
  WentOffline: {},
  WentOnline: {},
})

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const BoardBinding = ApplicationDefinition.makeBinding(orderBoardQuery, {
  field: 'board',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(orderBoardQuery, {
    // Each applied entry confirms the intent that produced it.
    AppliedEntry: ({ meta }) =>
      ApplicationDefinition.makeFieldsStep(() => ({
        pendingIntentIds: Array.filter(intentId => intentId !== meta.intentId),
      })),
  }),
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [BoardBinding],
})

const init = ApplicationComposition.makeInit(() => ({
  model: { pendingIntentIds: [] },
  // Start watching after the LiveQuery Model is stored in its parent.
  steps: [BoardBinding.requestWatch({ args: { boardId: 'kitchen' } })],
}))

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    WentOffline: () => BoardBinding.requestPause()(model),
    WentOnline: () => BoardBinding.requestResume()(model),
  }),
)
