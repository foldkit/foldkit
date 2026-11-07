import type { Block } from 'foldkit'

import { makeComposition, makeRequiredFieldBinding } from './block'
import { UiBlock } from './blocks'

export const UiModelBinding = makeRequiredFieldBinding(UiBlock, {
  field: 'uiModel',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApplicationComposition = makeComposition({
  bindings: [UiModelBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
