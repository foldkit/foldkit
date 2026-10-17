import { HomeComposition } from './definition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const block = HomeComposition.makeBlock({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
})
