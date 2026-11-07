import { Layer } from 'effect'
import { Query } from 'foldkit/experimental'

import { Tabs } from '@foldkit/ui'

import { ApplicationBlock } from './block'
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
}).pipe(Layer.provide(Layer.mergeAll(Query.layer, Tabs.layer)))
