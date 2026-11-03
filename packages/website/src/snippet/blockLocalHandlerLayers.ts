import { Effect, Layer } from 'effect'

import { LoadWorkOrders, SaveWorkOrder } from './command'
import { WorkOrdersDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const EffectsLayer = Layer.mergeAll(LoadWorkOrders.layer, SaveWorkOrder.layer)

export const layer = WorkOrdersDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).layer
