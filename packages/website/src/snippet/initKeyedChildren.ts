import { Array, Number, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import * as Counter from './counter'
import { Application } from './definition'
import { Message } from './message'
import { CounterInstance } from './model'

const INITIAL_COUNTER_COUNT = 3

const CountersBinding = Application.bindChild(Counter.block, {
  field: 'counters',
  key: 'id',
  childField: 'counter',
  toParentMessage: (id, message) => Message.GotCounterMessage({ id, message }),
  fromParentMessage: {
    parentMessage: Message.GotCounterMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
  init: {
    occurrences: () =>
      Array.makeBy(INITIAL_COUNTER_COUNT, counterId => ({
        key: `counter-${counterId}`,
        args: [],
      })),
    toItem: ({ key }, counter) => ({ id: key, counter }),
  },
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [CountersBinding],
})

const addCounter = Application.step((model, id: string) =>
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
