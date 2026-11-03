import { Effect, Layer } from 'effect'

import { layer as TabsLayer } from '@foldkit/ui/tabs'

import { SourceFileTabsBinding } from './composition'
import { ExampleDetailDefinition } from './definition'
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

export const ExampleDetailBlock = ExampleDetailDefinition.contract

const block = ExampleDetailDefinition.makeBlock(
  Effect.gen(function* () {
    const sourceFileTabs = yield* SourceFileTabsBinding

    return {
      children: [sourceFileTabs],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(TabsLayer))
export const layer = block.layer
