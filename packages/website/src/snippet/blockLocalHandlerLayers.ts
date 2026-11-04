import { Effect, Layer } from 'effect'

import { LoadWorkOrders, SaveWorkOrder } from './command'
import { WorkOrdersBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const EffectsLayer = Layer.mergeAll(LoadWorkOrders.layer, SaveWorkOrder.layer)

export const layer = WorkOrdersBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
)
