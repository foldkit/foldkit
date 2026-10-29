import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Update from 'foldkit/update'

const Model = Schema.Struct({
  lastRequestId: Schema.String,
  refreshCount: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({ RequestedRefresh: {} })
type Message = typeof Message.Type

const DispatchContext = Schema.Struct({ requestId: Schema.String })
type DispatchContext = typeof DispatchContext.Type

const ContextualRefreshDefinition = Block.makeDefinition('ContextualRefresh', {
  Model,
  Message,
})

const { makeFieldsStep } = ContextualRefreshDefinition

const ContextualRefreshComposition =
  ContextualRefreshDefinition.makeComposition()
const update = ContextualRefreshComposition.makeUpdate.withContext(
  ({ requestId }: DispatchContext) => ({
    RequestedRefresh: makeFieldsStep(() => ({
      lastRequestId: () => requestId,
    })),
  }),
)

const refreshStep = (model: Model) =>
  update(Message.RequestedRefresh())(model, { requestId: 'current' })

const countRefreshStep = makeFieldsStep(() => ({
  refreshCount: count => count + 1,
}))

export const requestRefreshStep = (model: Model) =>
  Update.combineSteps(model, [refreshStep, countRefreshStep])
