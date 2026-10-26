import { Array, Option } from 'effect'
import { Block, Struct, Update } from 'foldkit'
import * as PublicUpdate from 'foldkit/update'

import {
  CompositionSafetyParentDefinition,
  Entry,
  EntryBinding,
  LoadParameterizedChild,
  OptionalContextBlock,
  ParentMessage,
  ParentModel,
  PlainBinding,
  PlainBlock,
  RestContextBlock,
  combinedMixedConnectedStep,
  deferredMixedConnectedStep,
  initialParentModel,
  initializePlainStep,
  mixedConnectedSteps,
} from './composition-safety.accepted.js'

const rejectRawMixedConnectedSteps = () => {
  // @ts-expect-error A generic no-op cannot erase a connected Step's graph requirement.
  // oxfmt-ignore
  Update.combineSteps(initialParentModel, [PlainBinding.increment(), CompositionSafetyParentDefinition.makeNoopStep()])
  // @ts-expect-error Reversing Steps cannot erase the connected graph requirement.
  // oxfmt-ignore
  Update.combineSteps(initialParentModel, [CompositionSafetyParentDefinition.makeNoopStep(), PlainBinding.increment()])
  // @ts-expect-error A predeclared tuple retains the connected graph requirement.
  Update.combineSteps(initialParentModel, mixedConnectedSteps)
  // @ts-expect-error A deferred combination still requires its registered Composition.
  deferredMixedConnectedStep(initialParentModel)
}
const rejectReadableMixedRecipe = (
  model: Parameters<typeof combinedMixedConnectedStep>[0],
) => {
  const combined = combinedMixedConnectedStep(model)

  // @ts-expect-error A connected combination remains opaque before composition.
  combined.model
  // @ts-expect-error A connected combination cannot expose unresolved Commands.
  combined.commands
}
void rejectRawMixedConnectedSteps
void rejectReadableMixedRecipe

declare const useSecondField: boolean

// @ts-expect-error An accessor init projection must always supply one stable parent Model field.
// oxfmt-ignore
CompositionSafetyParentDefinition.makeBinding(PlainBlock, { placement: 'unstableProjected', read: model => Option.some(model.first), write: (model, nextChild) => Struct.modifyFields(model, { first: () => nextChild }), init: { contextToArgs: () => [], toParentFields: child => useSecondField ? { second: child } : { first: child } } })

// @ts-expect-error An optional update context still requires an explicit delivery context mapper.
// oxfmt-ignore
CompositionSafetyParentDefinition.makeBinding(OptionalContextBlock, { field: 'optionalContext' })

// @ts-expect-error A required rest update context requires an explicit delivery context mapper.
// oxfmt-ignore
CompositionSafetyParentDefinition.makeBinding(RestContextBlock, { field: 'restContext' })

// @ts-expect-error A connected Binding initializer requires its parent configuration.
PlainBinding.init()

// @ts-expect-error A keyed Binding initializer no longer accepts positional key and child arguments.
EntryBinding.init('entry', 1)

// @ts-expect-error Initializer arguments preserve the child init tuple.
// oxfmt-ignore
EntryBinding.init({ key: 'entry', args: ['one'], toParentModel: child => Struct.modifyFields(initialParentModel, { entries: Array.append(Entry.make({ id: 'entry', child })) }) })

// @ts-expect-error Keyed initializer keys preserve the Binding key type.
// oxfmt-ignore
EntryBinding.init({ key: 1, args: [1], toParentModel: child => Struct.modifyFields(initialParentModel, { entries: Array.append(Entry.make({ id: 'entry', child })) }) })

// @ts-expect-error The initializer projection must construct the complete parent Model.
PlainBinding.init({ args: [], toParentModel: child => child })

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that an erased parent Model cannot bypass validation.
declare const erasedParentModel: any
// @ts-expect-error An erased parent projection cannot bypass exact parent Model validation.
PlainBinding.init({ args: [], toParentModel: () => erasedParentModel })

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that an erased Commands collection cannot bypass validation.
declare const erasedParentCommands: any
// @ts-expect-error An erased parent Commands collection cannot bypass requirement validation.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: erasedParentCommands })

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that erased Command elements cannot bypass validation.
declare const erasedParentCommandElements: ReadonlyArray<any>
// @ts-expect-error Erased parent Command elements cannot bypass requirement validation.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: erasedParentCommandElements })

declare const erasedParentCommandRequirements: Update.Commands<
  typeof ParentMessage.Type,
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that erased Command requirements cannot bypass validation.
  any
>
// @ts-expect-error Erased parent Command requirements cannot bypass requirement validation.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: erasedParentCommandRequirements })

declare const unknownParentCommandRequirements: Update.Commands<
  typeof ParentMessage.Type,
  unknown
>
// @ts-expect-error Unknown parent Command requirements cannot bypass requirement validation.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: unknownParentCommandRequirements })

// @ts-expect-error Foldkit's explicit Step cannot erase connected registration evidence.
const erasedConnectedStep: Update.Step<
  typeof ParentModel.Type,
  typeof ParentMessage.Type
> = initializePlainStep
void erasedConnectedStep

const MissingPlainBindingComposition =
  CompositionSafetyParentDefinition.makeComposition({
    bindings: [EntryBinding],
  })
MissingPlainBindingComposition.makeInit(() =>
  // @ts-expect-error A connected initializer cannot run without its registered Binding capability.
  initializePlainStep(initialParentModel),
)

const directConnectedInit = MissingPlainBindingComposition.makeInit(() =>
  PlainBinding.init({
    args: [],
    toParentModel: child =>
      Struct.modifyFields(initialParentModel, { plain: () => child }),
  }),
)
// @ts-expect-error A directly connected initializer retains its missing Binding evidence.
MissingPlainBindingComposition.prepareBlock({
  init: directConnectedInit,
  update: MissingPlainBindingComposition.makeUpdate({
    CompletedParentInitialization: model => ({ model }),
    RequestedInitializeEntry: model => ({ model }),
    RequestedInitializePlain: model => ({ model }),
    RequestedInitializePlainWithOwningParentCommand: model => ({ model }),
    RequestedInitializePlainWithParentCommands: model => ({ model }),
  }),
  EffectsLayer: LoadParameterizedChild.layer,
})

// @ts-expect-error Passive operation construction is private to checked composition.
Update.makeResultRecipe
// @ts-expect-error Passive operation recognition is not a public execution seam.
Update.isResultRecipe
// @ts-expect-error Connected results have no public interpreter.
Update.runResultRecipe
// @ts-expect-error Connected result resolution is private to checked composition.
Update.resolveOperationOutput
// @ts-expect-error Binding initialization construction is private to composition.
Block.makeBindingInitRecipe
// @ts-expect-error Binding initialization recognition is private to composition.
Block.isBindingInitRecipe
// @ts-expect-error Binding initialization has no public interpreter.
Block.runBindingInitRecipe
// @ts-expect-error The update subpath also exposes no operation interpreter.
PublicUpdate.runResultRecipe
export type HiddenOperationRuntime =
  // @ts-expect-error Private update runtime modules are not package subpaths.
  typeof import('foldkit/update/operationRecipe')
export type HiddenInitializationRuntime =
  // @ts-expect-error Private Binding initialization modules are not package subpaths.
  typeof import('foldkit/block/initRecipe')
