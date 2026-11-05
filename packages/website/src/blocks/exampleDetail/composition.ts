import { Option } from 'effect'
import type { Block } from 'foldkit'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'
import { SourceFileTabsBlock } from './fileTabs'
import { ObserveExampleUrlMessages } from './mount'

export const SOURCE_FILE_TABS_ID = 'source-file-tabs'

export const SourceFileTabsBinding = makeBinding(SourceFileTabsBlock, {
  field: 'sourceFileTabs',
  init: { contextToArgs: () => [{ id: SOURCE_FILE_TABS_ID }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(SourceFileTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeActiveSourceFilePath: () => Option.some(value),
      })),
  }),
})

export const ExampleDetailComposition = makeComposition({
  bindings: [SourceFileTabsBinding],
  mounts: [ObserveExampleUrlMessages],
})
export type ExampleDetailViewBuilder = Block.ViewBuilderFor<
  typeof ExampleDetailComposition
>
