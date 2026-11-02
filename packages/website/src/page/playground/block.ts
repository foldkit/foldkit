import { Effect, Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

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
).provide(Layer.mergeAll(Tabs.layer))
export const layer = block.layer
