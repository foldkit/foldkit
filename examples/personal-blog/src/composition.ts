import type { Block } from 'foldkit'

import { makeBinding, makeComposition } from './block'
import { CounterBlock } from './blocks'

export const CounterBinding = makeBinding(CounterBlock, {
  field: 'counter',
})

export const ApplicationComposition = makeComposition({
  bindings: [CounterBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
