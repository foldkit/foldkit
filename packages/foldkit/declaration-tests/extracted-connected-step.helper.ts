import { modifyFields } from 'foldkit/struct'

import { ChildBinding, ParentDefinition } from './record-update.accepted.js'

const reportCountStep = ChildBinding.report({ amount: 0 })
const keepModelStep = ParentDefinition.makeNoopStep()

export const changeCount =
  (toCount: (count: number) => number) =>
  (model: Parameters<typeof reportCountStep>[0]) => {
    if (model.count < 0) {
      return keepModelStep(model)
    }

    return reportCountStep(modifyFields(model, { count: toCount }))
  }
