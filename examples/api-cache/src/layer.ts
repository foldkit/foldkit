import { Effect, Layer } from 'effect'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { ApplicationBlock } from './block'
import { TabsBinding } from './composition'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const tabs = yield* TabsBinding

    return {
      children: [tabs],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(TabsLayer))
