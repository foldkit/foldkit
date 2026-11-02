import { Effect, Schema } from 'effect'
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

const ContextualRefreshKey = Symbol('ContextualRefresh')

const ContextualRefreshDefinition = Block.makeDefinition('ContextualRefresh', {
  key: ContextualRefreshKey,
  Init: Schema.Tuple([]),
  Context: Schema.Tuple([DispatchContext]),

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

const init = ContextualRefreshComposition.makeInit(() => ({
  model: { lastRequestId: '', refreshCount: 0 },
}))

const ContextualRefreshBlock = ContextualRefreshDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update }
  }),
)

export const requestRefresh = Effect.gen(function* () {
  const block = yield* ContextualRefreshBlock.get
  const refresh = (model: Model) =>
    block.update(Message.RequestedRefresh())(model, { requestId: 'current' })
  const countRefresh = makeFieldsStep(() => ({
    refreshCount: count => count + 1,
  }))

  return Update.combineSteps(block.init().model, [refresh, countRefresh])
}).pipe(Effect.provide(ContextualRefreshBlock.layer))
