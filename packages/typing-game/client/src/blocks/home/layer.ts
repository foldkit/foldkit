import { HomeBlock } from './block'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = HomeBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
})
