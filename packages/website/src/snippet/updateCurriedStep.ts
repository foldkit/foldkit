import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ routeChangeCount: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedReset: {},
})
type Message = typeof Message.Type

const InMessage = defineMessageUnion({ InformedOfRouteChange: {} })
type InMessage = typeof InMessage.Type

const RouteAwareKey = Symbol('RouteAware')

const RouteAwareDefinition = Block.makeDefinition('RouteAware', {
  key: RouteAwareKey,
  Init: Schema.Tuple([]),

  Model,
  Message,
  InMessage,
})

const RouteAwareComposition = RouteAwareDefinition.makeComposition()

const init = RouteAwareComposition.makeInit(() => ({
  model: Model.make({ routeChangeCount: 0 }),
}))

const update = RouteAwareComposition.makeUpdate({
  ClickedReset: model => ({
    model: modifyFields(model, { routeChangeCount: () => 0 }),
  }),
})

const receive = RouteAwareComposition.makeReceive({
  InformedOfRouteChange: model => ({
    model: modifyFields(model, {
      routeChangeCount: count => count + 1,
    }),
  }),
})

export const RouteAwareBlock = RouteAwareDefinition.contract

export const layer = RouteAwareDefinition.makeBlock(
  Effect.gen(function* () {
    return { children: [], init, update, receive }
  }),
).layer
