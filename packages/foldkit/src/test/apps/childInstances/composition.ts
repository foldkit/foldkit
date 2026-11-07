import { CounterBlock } from './counter.js'
import { ApplicationDefinition, makeFieldsStep } from './definition.js'

export const CountersBinding = ApplicationDefinition.makeKeyedArrayBinding(
  CounterBlock,
  {
    field: 'counters',
    key: 'key',
    childField: 'model',
  },
).withOutMessagePolicy({
  fold: (_key, outMessage) =>
    ApplicationDefinition.makeOutMessageFold(CounterBlock, {
      ChangedCount: ({ count }) =>
        makeFieldsStep(() => ({
          lastChangedCount: () => count,
        })),
    })(outMessage),
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CountersBinding],
})
