import { Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import { EffectsLayer } from './effectsLayer'
import { init } from './init'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
}).pipe(Layer.provide(Tabs.layer))
