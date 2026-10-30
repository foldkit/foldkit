import { Layer } from 'effect'

import { LoadWorkOrders, SaveWorkOrder } from './command'
import { WorkOrdersComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const EffectsLayer = Layer.mergeAll(LoadWorkOrders.layer, SaveWorkOrder.layer)

const prepare = () =>
  WorkOrdersComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
