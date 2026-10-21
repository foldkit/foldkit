import { ApplicationComposition } from './composition'
import { init } from './init'
import { EffectsLayer } from './layer'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

export const ApplicationBlock = ApplicationComposition.implement({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
}).assembleBlock()
