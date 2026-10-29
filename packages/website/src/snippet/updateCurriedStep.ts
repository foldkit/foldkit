import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Model = Schema.Struct({ routeChangeCount: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  InformedOfRouteChange: {},
  ClickedReset: {},
})
type Message = typeof Message.Type

const RouteAwareComposition = Block.makeDefinition('RouteAware', {
  Model,
  Message,
}).makeComposition()
const informRouteChanged = Message.InformedOfRouteChange

const init = RouteAwareComposition.makeInit(() => ({
  model: Model.make({ routeChangeCount: 0 }),
}))

const update = RouteAwareComposition.makeUpdate({
  InformedOfRouteChange: model => ({
    model: modifyFields(model, {
      routeChangeCount: count => count + 1,
    }),
  }),
  ClickedReset: model => ({
    model: modifyFields(model, { routeChangeCount: () => 0 }),
  }),
})

const prepare = () =>
  RouteAwareComposition.prepareBlock({
    init,
    update,
    operations: { informRouteChanged },
  })
export const RouteAwareBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
