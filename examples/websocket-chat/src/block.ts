import { Effect } from 'effect'

import { ApplicationBlock } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
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

export { ApplicationBlock } from './definition'
