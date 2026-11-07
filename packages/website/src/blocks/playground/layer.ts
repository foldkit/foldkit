import { Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { PlaygroundBlock } from './block'
import {
  EffectsLayer,
  inMessageUpdate,
  init,
  managedResources,
  update,
  view,
} from './playground'

export const layer = PlaygroundBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  managedResources,
  EffectsLayer,
}).pipe(Layer.provide(Layer.mergeAll(Tabs.layer)))
