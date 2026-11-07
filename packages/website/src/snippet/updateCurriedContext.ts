import { Schema } from 'effect'
import { Block, Story } from 'foldkit'
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

export const ContextualRefreshKey = Symbol('ContextualRefresh')
export const ContextualRefreshBlock = Block.make('ContextualRefresh', {
  key: ContextualRefreshKey,
  InitArgs: Schema.Tuple([]),
  Context: Schema.Tuple([DispatchContext]),

  Model,
  Message,
})

const { makeFieldsStep, makeComposition } = ContextualRefreshBlock

const ContextualRefreshComposition = makeComposition()
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

const layer = ContextualRefreshBlock.makeLayer({
  init,
  update,
})

export const requestRefresh = Story.withBlock(
  { block: ContextualRefreshBlock, layer },
  block => {
    const refresh = (model: Model) =>
      block.update(Message.RequestedRefresh())(model, { requestId: 'current' })
    const countRefresh = makeFieldsStep(() => ({
      refreshCount: count => count + 1,
    }))

    return Update.combineSteps(block.init().model, [refresh, countRefresh])
  },
)
