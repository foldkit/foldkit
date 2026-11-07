import { RoomBlock } from './block'
import { EffectsLayer } from './effectsLayer'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = RoomBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  subscriptions,
  EffectsLayer,
})
