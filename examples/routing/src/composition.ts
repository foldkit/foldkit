import type { Block } from 'foldkit'

import { PeopleBlock } from './blocks'
import { ApplicationDefinition } from './definition'

export const PeoplePageBinding = ApplicationDefinition.makeBinding(
  PeopleBlock,
  {
    field: 'peoplePage',
    init: { contextToArgs: route => [route] },
  },
)

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [PeoplePageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
