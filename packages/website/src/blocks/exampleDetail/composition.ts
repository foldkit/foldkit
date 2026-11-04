import { Option } from 'effect'
import type { Block } from 'foldkit'

import { ExampleDetailBlock, makeFieldsStep } from './definition'
import { SourceFileTabsBlock } from './fileTabs'
import { ObserveExampleUrlMessages } from './mount'

export const SOURCE_FILE_TABS_ID = 'source-file-tabs'

export const SourceFileTabsBinding = ExampleDetailBlock.makeBinding(
  SourceFileTabsBlock,
  {
    field: 'sourceFileTabs',
    init: { contextToArgs: () => [{ id: SOURCE_FILE_TABS_ID }] },
  },
).withOutMessagePolicy({
  fold: ExampleDetailBlock.makeOutMessageFold(SourceFileTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeActiveSourceFilePath: () => Option.some(value),
      })),
  }),
})

export const ExampleDetailComposition = ExampleDetailBlock.makeComposition({
  bindings: [SourceFileTabsBinding],
  mounts: [ObserveExampleUrlMessages],
})
export type ExampleDetailViewBuilder = Block.ViewBuilderFor<
  typeof ExampleDetailComposition
>
