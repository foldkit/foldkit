import { Array, Layer } from 'effect'
import { Update } from 'foldkit'

import {
  ApplicationBlock,
  ApplicationComposition,
  CountersBinding,
  addCounter,
  makeFieldsStep,
  makeStep,
} from './blockInstanceArray'
import * as Counter from './initResetCounter'

const INITIAL_COUNTER_COUNT = 3

const init = ApplicationComposition.makeInit(() => ({
  model: { counters: [], nextCounterId: 0 },
  steps: Array.makeBy(INITIAL_COUNTER_COUNT, () => addCounter),
}))

const update = ApplicationComposition.makeUpdate({
  ClickedAddCounter: addCounter,
  ClickedAddAndResetCounter: makeStep(model =>
    Update.combineSteps([
      addCounter,
      CountersBinding.requestReset(`counter-${model.nextCounterId}`),
    ]),
  ),
  ClickedRemoveCounter: makeFieldsStep.fromMessage(({ key }) => ({
    counters: Array.filter(counter => counter.key !== key),
  })),
})

export const layer = ApplicationBlock.makeLayer({
  init,
  update,
}).pipe(Layer.provide(Counter.layer))

export { ApplicationBlock } from './blockInstanceArray'
