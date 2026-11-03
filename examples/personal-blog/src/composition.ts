import type { Block } from 'foldkit'

import { CounterBlock } from './blocks'
import { ApplicationDefinition } from './definition'

export const CounterBinding = ApplicationDefinition.makeBinding(CounterBlock, {
  field: 'counter',
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CounterBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
