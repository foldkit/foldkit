import type { Block } from 'foldkit'

import { CounterBlock } from './blocks'
import { ApplicationBlock } from './definition'

export const CounterBinding = ApplicationBlock.makeBinding(CounterBlock, {
  field: 'counter',
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [CounterBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
