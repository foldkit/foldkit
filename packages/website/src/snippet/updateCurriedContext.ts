import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

const Model = Schema.Struct({
  lastRequestId: Schema.String,
  refreshCount: Schema.Number,
})
const Message = defineMessageUnion({ RequestedRefresh: {} })
const DispatchContext = Schema.Struct({ requestId: Schema.String })
const ContextualRefreshDefinition = Block.makeDefinition('ContextualRefresh', {
  Model,
  Message,
})
const ContextualRefreshComposition =
  ContextualRefreshDefinition.makeComposition()
const update = ContextualRefreshComposition.makeUpdate.withContext(
  ({ requestId }: typeof DispatchContext.Type) => ({
    RequestedRefresh: model => ({
      model: modifyFields(model, { lastRequestId: () => requestId }),
    }),
  }),
)

const refresh = (model: typeof Model.Type) =>
  update(Message.RequestedRefresh())(model, { requestId: 'current' })

const countRefresh = ContextualRefreshDefinition.makeFieldsStep(() => ({
  refreshCount: count => count + 1,
}))

export const requestRefresh = (model: typeof Model.Type) =>
  Update.combineSteps(model, [refresh, countRefresh])
