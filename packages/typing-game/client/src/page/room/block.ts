import { Effect } from 'effect'

import { RoomDefinition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { receive } from './receive'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const RoomBlock = RoomDefinition.contract
export const layer = RoomDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      receive,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
).layer
