import { Effect, Layer } from 'effect'

import { SaveProject } from './command'
import { ProjectSettingsDefinition } from './definition'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const block = ProjectSettingsDefinition.makeBlock(
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

export const layer = block.layer
