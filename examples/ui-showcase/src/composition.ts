import type { Block } from 'foldkit'

import { UiBlock } from './blocks'
import { ApplicationBlock } from './definition'

export const UiModelBinding = ApplicationBlock.makeBinding(UiBlock, {
  field: 'uiModel',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [UiModelBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
