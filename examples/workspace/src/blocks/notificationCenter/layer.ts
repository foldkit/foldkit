import { Effect, Layer } from 'effect'

import { layer as PopoverLayer } from '@foldkit/ui/popover'

import { NotificationCenterBlock } from './block'
import { PopoverBinding } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = NotificationCenterBlock.makeLayer(
  Effect.gen(function* () {
    const popover = yield* PopoverBinding

    return {
      children: [popover],
      init,
      update,
      inMessageUpdate,
      view,
      subscriptions,
      EffectsLayer: subscriptions.layer,
    }
  }),
).pipe(Layer.provide(PopoverLayer))
