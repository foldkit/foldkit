import type { Block } from 'foldkit'

import { UiBlock } from './blocks'
import { ApplicationDefinition } from './definition'

export const UiModelBinding = ApplicationDefinition.makeBinding(UiBlock, {
  field: 'uiModel',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [UiModelBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
