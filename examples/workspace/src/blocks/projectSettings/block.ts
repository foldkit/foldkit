import { Effect, Layer } from 'effect'

import { SaveProject } from './command'
import { ProjectSettingsBlock } from './definition'
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

export { ProjectSettingsBlock } from './definition'
