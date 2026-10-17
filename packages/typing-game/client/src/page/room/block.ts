import { RoomComposition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { informJoined, update } from './update'
import { view } from './view'

export const block = RoomComposition.makeBlock({
  init,
  update,
  view,
  expose: { informJoined },
  subscriptions,
  EffectsLayer,
})
