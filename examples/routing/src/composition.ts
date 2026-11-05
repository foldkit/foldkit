import type { Block } from 'foldkit'

import { makeBinding, makeComposition } from './block'
import { PeopleBlock } from './blocks'

export const PeoplePageBinding = makeBinding(PeopleBlock, {
  field: 'peoplePage',
  init: { contextToArgs: route => [route] },
})

export const ApplicationComposition = makeComposition({
  bindings: [PeoplePageBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
