import type { Block } from 'foldkit'

import { PeopleBlock } from './blocks'
import { ApplicationBlock } from './definition'

export const PeoplePageBinding = ApplicationBlock.makeBinding(PeopleBlock, {
  field: 'peoplePage',
  init: { contextToArgs: route => [route] },
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [PeoplePageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
