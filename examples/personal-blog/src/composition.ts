import type { Block } from 'foldkit'

import { makeComposition, makeRequiredFieldBinding } from './block'
import { CounterBlock } from './blocks'

export const CounterBinding = makeRequiredFieldBinding(CounterBlock, {
  field: 'counter',
})

export const ApplicationComposition = makeComposition({
  bindings: [CounterBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
