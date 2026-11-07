import type { Block } from 'foldkit'

import {
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import { PlaygroundFileTabsBlock } from './fileTabs'
import { MountPlaygroundEditor } from './mount'

export const FileTabsBinding = makeRequiredFieldBinding(
  PlaygroundFileTabsBlock,
  {
    field: 'fileTabs',
    init: { contextToArgs: () => [{ id: 'playground-files' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PlaygroundFileTabsBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        activeFilePath: () => value,
      })),
  }),
})

export const PlaygroundComposition = makeComposition({
  mounts: [MountPlaygroundEditor],
  bindings: [FileTabsBinding],
})
export type PlaygroundViewBuilder = Block.ViewBuilderFor<
  typeof PlaygroundComposition
>
