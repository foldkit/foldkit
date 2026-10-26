import { Array, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'

import * as Counter from './counter'
import { makeStep } from './definition'
import { CounterInstance } from './model'

const INITIAL_COUNTER_COUNT = 3

const CountersBinding = ApplicationDefinition.makeBinding(
  Counter.CounterBlock,
  {
    field: 'counters',
    key: 'id',
    childField: 'counter',
    init: {
      instances: () =>
        Array.makeBy(INITIAL_COUNTER_COUNT, counterId => ({
          key: `counter-${counterId}`,
          args: [],
        })),
      toItem: ({ key }, counter) => ({ id: key, counter }),
    },
  },
)

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CountersBinding],
})

const addCounterStep = makeStep((model, id: string) =>
  CountersBinding.init({
    key: id,
    args: [],
    toParentModel: counter =>
      modifyFields(model, {
        counters: Array.append(CounterInstance.make({ id, counter })),
        nextCounterId: Number.increment,
      }),
  }),
)

const init = ApplicationComposition.makeInit(() => ({
  model: { nextCounterId: INITIAL_COUNTER_COUNT },
}))
