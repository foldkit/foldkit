import { changeCount } from './extracted-connected-step.helper.js'
import {
  ChildBinding,
  ParentComposition,
  ParentDefinition,
} from './record-update.accepted.js'

export { changeCount } from './extracted-connected-step.helper.js'
export const update = ParentComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeNoopStep(),
  RequestedReport: changeCount(count => count + 1),
  RequestedSave: model => ChildBinding.save()(model),
  CompletedSave: ParentDefinition.makeNoopStep(),
})
