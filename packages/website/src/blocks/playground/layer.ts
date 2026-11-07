import { Effect, Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { PlaygroundBlock } from './block'
import { PlaygroundComposition } from './composition'
import {
  EffectsLayer,
  inMessageUpdate,
  init,
  managedResources,
  update,
  view,
} from './playground'

export const layer = PlaygroundBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* PlaygroundComposition.acquireChildren()

    return {
      children,
      init,
      update,
      inMessageUpdate,
      view,
      managedResources,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Tabs.layer)))
