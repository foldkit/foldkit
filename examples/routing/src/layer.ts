import { Layer } from 'effect'

import { ApplicationBlock } from './block'
import { People } from './blocks'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
}).pipe(Layer.provide(People.layer))
