import { Effect, Layer } from 'effect'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { FileTabsBinding } from './composition'
import { PlaygroundBlock } from './definition'
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
    const fileTabs = yield* FileTabsBinding

    return {
      children: [fileTabs],
      init,
      update,
      inMessageUpdate,
      view,
      managedResources,
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(TabsLayer)))

export { PlaygroundBlock }
