import { Effect } from 'effect'

import { HomeBlock } from './block'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = HomeBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
)
