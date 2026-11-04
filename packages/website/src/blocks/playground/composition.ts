import type { Block } from 'foldkit'

import { PlaygroundBlock, makeFieldsStep } from './definition'
import { PlaygroundFileTabsBlock } from './fileTabs'
import { MountPlaygroundEditor } from './mount'

export const FileTabsBinding = PlaygroundBlock.makeBinding(
  PlaygroundFileTabsBlock,
  {
    field: 'fileTabs',
    init: { contextToArgs: () => [{ id: 'playground-files' }] },
  },
).withOutMessagePolicy({
  fold: PlaygroundBlock.makeOutMessageFold(PlaygroundFileTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        activeFilePath: () => value,
      })),
  }),
})

export const PlaygroundComposition = PlaygroundBlock.makeComposition({
  mounts: [MountPlaygroundEditor],
  bindings: [FileTabsBinding],
})
export type PlaygroundViewBuilder = Block.ViewBuilderFor<
  typeof PlaygroundComposition
>
