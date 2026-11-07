import { Effect, Layer } from 'effect'

import { Popover } from '@foldkit/ui'

import { NotificationCenterBlock } from './block'
import { NotificationCenterComposition } from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = NotificationCenterBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* NotificationCenterComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      subscriptions,
      EffectsLayer: subscriptions.layer,
    }
  }),
).pipe(Layer.provide(Popover.layer))
