import { Effect, Layer } from 'effect'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { TabsBinding } from './composition'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
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

export { ApplicationBlock } from './definition'
