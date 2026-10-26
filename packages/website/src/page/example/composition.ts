import { Option, Tuple } from 'effect'
import type { Block } from 'foldkit'

import { ExampleDetailDefinition, makeFieldsStep } from './definition'
import { SourceFileTabsBlock } from './fileTabs'
import { ObserveExampleUrlMessages } from './mount'

export const SOURCE_FILE_TABS_ID = 'source-file-tabs'

export const SourceFileTabsBinding = ExampleDetailDefinition.makeBinding(
  SourceFileTabsBlock,
  {
    field: 'sourceFileTabs',
    init: { contextToArgs: () => Tuple.make({ id: SOURCE_FILE_TABS_ID }) },
  },
).withOutMessagePolicy({
  fold: ExampleDetailDefinition.makeOutMessageFold(SourceFileTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeActiveSourceFilePath: () => Option.some(value),
      })),
  }),
})

export const mounts = [ObserveExampleUrlMessages]

export const ExampleDetailComposition = ExampleDetailDefinition.makeComposition(
  {
    bindings: [SourceFileTabsBinding],
    mounts,
  },
)
export type ExampleDetailViewBuilder = Block.ViewBuilderFor<
  typeof ExampleDetailComposition
>
