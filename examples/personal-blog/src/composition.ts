import type { Block } from 'foldkit'

import { Application } from './definition'
import { Counter } from './island'
import { Message } from './message'

export const CounterBinding = Application.bindChild(Counter.block, {
  field: 'counter',
  parentMessage: Message.GotCounterMessage,
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [CounterBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
