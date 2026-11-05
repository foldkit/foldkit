import * as Counter from '../counter'
import { makeBinding, makeComposition } from './block'

export const CounterBinding = makeBinding(Counter.CounterBlock, {
  field: 'counter',
})

export const DashboardComposition = makeComposition({
  bindings: [CounterBinding],
})
