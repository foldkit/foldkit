import { Effect, Layer } from 'effect'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { FileTabsBinding } from './composition'
import { PlaygroundDefinition } from './definition'
import {
  EffectsLayer,
  init,
  managedResources,
  receive,
  update,
  view,
} from './playground'

export const PlaygroundBlock = PlaygroundDefinition.contract

const block = PlaygroundDefinition.makeBlock(
  Effect.gen(function* () {
    const fileTabs = yield* FileTabsBinding

    return {
      children: [fileTabs],
      init,
      update,
      receive,
      view,
      managedResources,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(TabsLayer))
export const layer = block.layer
