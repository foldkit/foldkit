import { Array, Effect, Layer } from 'effect'

import * as Update from 'foldkit/update'
import { ApplicationComposition, CountersBinding } from './composition.js'
import { layer as CounterLayer } from './counter.js'
import {
  ApplicationDefinition,
  makeFieldsStep,
  makeStep,
} from './definition.js'
import { addCounter, summarizeCounters } from './transitions.js'

export const init = ApplicationComposition.makeInit(initialCounts => ({
  model: { counters: [], summary: 0, lastChangedCount: 0 },
  steps: Array.map(initialCounts, (count, index) =>
    addCounter(`counter-${index}`, count),
  ),
}))
export const update = ApplicationComposition.makeUpdate({
  ClickedAddCounter: makeFieldsStep((_model, { key, count }) => ({
    counters: Array.append(CountersBinding.create({ key, args: [count] })),
  })),
  ClickedAddAndIncrement: makeStep((_model, { key, count }) =>
    Update.combineSteps([
      addCounter(key, count),
      CountersBinding.requestIncrement(key),
      summarizeCounters,
    ]),
  ),
  ClickedRemoveCounter: makeFieldsStep.fromMessage(({ key }) => ({
    counters: Array.filter(counter => counter.key !== key),
  })),
})
export const view = ApplicationComposition.makeView((model, h) =>
  h.div(
    [],
    Array.map(model.counters, counter =>
      h.block(
        CountersBinding.embedView({
          key: counter.key,
          slotId: counter.key,
          model: counter.model,
        }),
      ),
    ),
  ),
)
export const ApplicationBlock = ApplicationDefinition.makeLayer(
  Effect.gen(function* () {
    const counters = yield* CountersBinding

    return {
      children: [counters],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(CounterLayer))
