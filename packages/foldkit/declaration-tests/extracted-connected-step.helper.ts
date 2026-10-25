import { modifyFields } from 'foldkit/struct'

import { ChildBinding, ParentDefinition } from './record-update.accepted.js'

const reportCount = ChildBinding.report({ amount: 0 })
const keepModel = ParentDefinition.makeNoopStep()

export const changeCount =
  (toCount: (count: number) => number) =>
  (model: Parameters<typeof reportCount>[0]) => {
    if (model.count < 0) {
      return keepModel(model)
    }

    return reportCount(modifyFields(model, { count: toCount }))
  }
