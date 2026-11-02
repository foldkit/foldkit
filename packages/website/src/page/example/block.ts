import { Effect, Layer } from 'effect'

import { Tabs } from '@foldkit/ui'

import { SourceFileTabsBinding } from './composition'
import { ExampleDetailDefinition } from './definition'
import { EffectsLayer, init, receive, update, view } from './example'

export { mounts } from './composition'
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
      receive,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(Tabs.layer))
export const layer = block.layer
