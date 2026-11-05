import type { Block } from 'foldkit'

import { makeBinding, makeComposition } from './block'
import { UiBlock } from './blocks'

export const UiModelBinding = makeBinding(UiBlock, {
  field: 'uiModel',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApplicationComposition = makeComposition({
  bindings: [UiModelBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
