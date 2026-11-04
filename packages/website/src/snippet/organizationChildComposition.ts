import * as Counter from '../counter'
import { DashboardBlock } from './definition'

export const CounterBinding = DashboardBlock.makeBinding(Counter.CounterBlock, {
  field: 'counter',
})

export const DashboardComposition = DashboardBlock.makeComposition({
  bindings: [CounterBinding],
})
