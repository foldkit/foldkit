import { Effect } from 'effect'

import { layer as PopoverLayer } from '@foldkit/ui/popover'

import { PopoverBinding } from './composition'
import { NotificationCenterDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const block = NotificationCenterDefinition.makeBlock(
  Effect.gen(function* () {
    const popover = yield* PopoverBinding
    return {
      children: [popover],
      init,
      update,
      receive,
      view,
      subscriptions,
      EffectsLayer: subscriptions.layer,
    }
  }),
).provide(PopoverLayer)

export const layer = block.layer
