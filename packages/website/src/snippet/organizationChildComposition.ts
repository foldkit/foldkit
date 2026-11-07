import * as Counter from '../counter'
import { makeRequiredFieldBinding, makeComposition } from './block'

export const CounterBinding = makeRequiredFieldBinding(Counter.CounterBlock, {
  field: 'counter',
})

export const DashboardComposition = makeComposition({
  bindings: [CounterBinding],
})
