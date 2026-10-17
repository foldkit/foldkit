import * as Counter from '../counter'
import { Dashboard } from './definition'
import { Message } from './message'

export const CounterBinding = Dashboard.bindChild(Counter.block, {
  field: 'counter',
  parentMessage: Message.GotCounterMessage,
})

export const DashboardComposition = Dashboard.makeComposition({
  childBindings: [CounterBinding],
})
