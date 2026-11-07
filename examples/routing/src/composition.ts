import type { Block } from 'foldkit'

import { makeComposition, makeRequiredFieldBinding } from './block'
import { PeopleBlock } from './blocks'

export const PeoplePageBinding = makeRequiredFieldBinding(PeopleBlock, {
  field: 'peoplePage',
  init: { contextToArgs: route => [route] },
})

export const ApplicationComposition = makeComposition({
  bindings: [PeoplePageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
