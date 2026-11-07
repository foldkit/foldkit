import { Effect, Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { ExampleDetailBlock } from './block'
import { ExampleDetailComposition } from './composition'
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

export const layer = ExampleDetailBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* ExampleDetailComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Tabs.layer)))
