import { Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { ExampleDetailBlock } from './block'
import { EffectsLayer, inMessageUpdate, init, update, view } from './example'

export {
  CurrentSourcesAsyncData,
  EffectsLayer,
  init,
  LoadExampleSources,
  Message,
  Model,
  tableOfContents,
  update,
  view,
} from './example'

export const layer = ExampleDetailBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer,
}).pipe(Layer.provide(Layer.mergeAll(Tabs.layer)))
