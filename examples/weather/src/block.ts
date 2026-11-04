import { Effect } from 'effect'

import { EffectsLayer } from './command'
import { ApplicationBlock } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer(
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

export { ApplicationBlock } from './definition'
