import { Layer } from 'effect'

import { ApplicationBlock } from './block'
import { Home, Room } from './blocks'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer,
}).pipe(Layer.provide(Layer.mergeAll(Home.layer, Room.layer)))
