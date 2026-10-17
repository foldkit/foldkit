import { Option, Tuple } from 'effect'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Tabs } from '@foldkit/ui'

import { ExampleDetail } from './definition'
import { Message } from './message'
import { Model } from './model'
import { ObserveExampleUrlMessages } from './mount'

export const SourceFileTabs = Tabs.create()
export const SOURCE_FILE_TABS_ID = 'source-file-tabs'

const foldSourceFileTabsOutMessage = Tabs.OutMessage.match<
  Update.Step<Model, Message>
>({
  Selected:
    ({ value }) =>
    model => ({
      model: modifyFields(model, {
        maybeActiveSourceFilePath: () => Option.some(value),
      }),
    }),
})

export const SourceFileTabsBinding = ExampleDetail.bindChild(SourceFileTabs, {
  field: 'sourceFileTabs',
  parentMessage: Message.GotSourceFileTabsMessage,
  outMessage: { fold: foldSourceFileTabsOutMessage },
  init: { args: () => Tuple.make({ id: SOURCE_FILE_TABS_ID }) },
})

export const mounts = [ObserveExampleUrlMessages]

export const ExampleDetailComposition = ExampleDetail.makeComposition({
  childBindings: [SourceFileTabsBinding],
  mounts,
})
export type ExampleDetailViewBuilder = Block.ViewBuilderFor<
  typeof ExampleDetailComposition
>
