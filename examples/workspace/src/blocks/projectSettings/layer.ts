import { Effect, Layer } from 'effect'

import { ProjectSettingsBlock } from './block'
import { SaveProject } from './command'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ProjectSettingsBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer: Layer.mergeAll(SaveProject.layer, subscriptions.layer),
    }
  }),
)
