import { Effect } from 'effect'

import { HomeDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const HomeBlock = HomeDefinition.contract
export const layer = HomeDefinition.makeBlock(
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
).layer
