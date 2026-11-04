import { Effect } from 'effect'

import { RoomBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = RoomBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      inMessageUpdate,
      view,
      subscriptions,
      EffectsLayer,
    }
  }),
)

export { RoomBlock }
