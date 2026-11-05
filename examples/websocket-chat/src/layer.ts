import { Effect } from 'effect'

import { ApplicationBlock } from './block'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { managedResources } from './managedResource'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      subscriptions,
      managedResources,
      EffectsLayer,
    }
  }),
)
