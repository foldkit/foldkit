import { changeCount } from './extracted-connected-step.helper.js'
import { ParentDefinition, ParentModel } from './record-update.accepted.js'

const model = ParentModel.make({ child: { count: 0 }, count: 0 })

// @ts-expect-error An ordinary Model cannot execute a connected transformation.
changeCount(count => count + 1)(model)

// @ts-expect-error The owning field still requires its exact transformer output.
changeCount(() => 'wrong')

const UnregisteredComposition = ParentDefinition.makeComposition()
UnregisteredComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeNoopStep(),
  // @ts-expect-error The extracted input contract retains the child registration obligation.
  RequestedReport: changeCount(count => count + 1),
  RequestedSave: ParentDefinition.makeNoopStep(),
  CompletedSave: ParentDefinition.makeNoopStep(),
})
