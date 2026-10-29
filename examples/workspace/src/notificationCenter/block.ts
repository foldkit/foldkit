import { Block } from 'foldkit'

import { NotificationCenterComposition } from './composition'
import { init } from './init'
import { Message } from './message'
import type { Model } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const prepare = () =>
  NotificationCenterComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer: subscriptions.layer,
    operations: {
      informActivity: Message.InformedOfActivity,
    },
  })
export const NotificationCenterBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
