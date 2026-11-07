import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ routeChangeCount: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedReset: {},
})
type Message = typeof Message.Type

const InMessage = defineInMessageUnion({ InformedOfRouteChange: {} })
type InMessage = typeof InMessage.Type

export const RouteAwareKey = Symbol('RouteAware')
export const RouteAwareBlock = Block.make('RouteAware', {
  key: RouteAwareKey,
  InitArgs: Schema.Tuple([]),

  Model,
  Message,
  InMessage,
})

const { makeComposition } = RouteAwareBlock

const RouteAwareComposition = makeComposition()

const init = RouteAwareComposition.makeInit(() => ({
  model: Model.make({ routeChangeCount: 0 }),
}))

const update = RouteAwareComposition.makeUpdate({
  ClickedReset: model => ({
    model: modifyFields(model, { routeChangeCount: () => 0 }),
  }),
})

const inMessageUpdate = RouteAwareComposition.makeInMessageUpdate({
  InformedOfRouteChange: model => ({
    model: modifyFields(model, {
      routeChangeCount: count => count + 1,
    }),
  }),
})

export const layer = RouteAwareBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
    }
  }),
)
