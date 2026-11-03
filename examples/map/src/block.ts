import { Effect } from 'effect'

import { ApplicationDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { update } from './update'
import { view } from './view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
)
