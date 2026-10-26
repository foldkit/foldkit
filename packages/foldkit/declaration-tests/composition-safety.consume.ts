import { Array, Option } from 'effect'
import { Block, Command, Struct, Update } from 'foldkit'
import * as PublicUpdate from 'foldkit/update'

import {
  ChildMessage,
  CompleteParentInitialization,
  CompositionSafetyParentDefinition,
  Entry,
  EntryBinding,
  LoadParameterizedChild,
  OptionalContextBlock,
  ParentCommandsBinding,
  ParentMessage,
  ParentModel,
  PlainBinding,
  PlainBlock,
  RestContextBlock,
  StrictBlock,
  combinedMixedConnectedStep,
  deferredMixedConnectedStep,
  deferredMixedConnectedUpdate,
  emptyPlainSteps,
  explicitGenericOrdinaryUpdate,
  foldPlain,
  foldStableProjected,
  initialParentModel,
  initialize,
  initializeDerivedModel,
  initializeDerivedStepsStep,
  initializeEntryStep,
  initializePlainStep,
  initializePlainWithParentCommandsStep,
  makeParentCommandInitRecipe,
  mixedConnectedCommandsStep,
  mixedConnectedCommandsUpdate,
  mixedConnectedSteps,
  mixedConnectedUpdate,
  pureMixedCommandsFirst,
  pureMixedCommandsLast,
  reversedMixedConnectedUpdate,
  tupleMixedConnectedUpdate,
} from './composition-safety.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value
type EveryMemberEqual<Value, Expected> = Equal<
  Value extends unknown ? Equal<Value, Expected> : never,
  true
>
type RecipeModel<Value> =
  Value extends Update.ResultRecipe<
    infer Model,
    infer _Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Model
    : never
type RecipeMessage<Value> =
  Value extends Update.ResultRecipe<
    infer _Model,
    infer Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Message
    : never

type EmittedMixedConnectedRecipeIsExact = Expect<
  Equal<
    ReturnType<typeof combinedMixedConnectedStep>,
    ReturnType<ReturnType<typeof PlainBinding.increment>>
  >
>
type EmittedDeferredMixedRecipeIsExact = Expect<
  Equal<
    ReturnType<typeof deferredMixedConnectedStep>,
    ReturnType<typeof combinedMixedConnectedStep>
  >
>
type EmittedMixedRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof mixedConnectedUpdate>>,
    | Block.RequirementOfBinding<typeof PlainBinding>
    | Block.RequirementOfBinding<typeof ParentCommandsBinding>
    | Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type EmittedReversedMixedResultIsExact = Expect<
  Equal<
    ReturnType<typeof reversedMixedConnectedUpdate>,
    ReturnType<typeof mixedConnectedUpdate>
  >
>
type EmittedTupleMixedResultIsExact = Expect<
  Equal<
    ReturnType<typeof tupleMixedConnectedUpdate>,
    ReturnType<typeof mixedConnectedUpdate>
  >
>
type EmittedDeferredMixedResultIsExact = Expect<
  Equal<
    ReturnType<typeof deferredMixedConnectedUpdate>,
    ReturnType<typeof mixedConnectedUpdate>
  >
>
type EmittedExplicitGenericOrdinaryModelIsExact = Expect<
  Equal<
    ReturnType<typeof explicitGenericOrdinaryUpdate>['model'],
    typeof ParentModel.Type
  >
>
type EmittedExplicitGenericOrdinaryRequirementsAreExact = Expect<
  Equal<Update.RequirementsOf<typeof explicitGenericOrdinaryUpdate>, never>
>
type EmittedMixedCommandsModelIsExact = Expect<
  Equal<
    RecipeModel<ReturnType<typeof mixedConnectedCommandsStep>>,
    typeof ParentModel.Type
  >
>
type EmittedMixedCommandsMessageIsExact = Expect<
  Equal<
    RecipeMessage<ReturnType<typeof mixedConnectedCommandsStep>>,
    | RecipeMessage<ReturnType<ReturnType<typeof PlainBinding.increment>>>
    | typeof ParentMessage.CompletedParentInitialization.Type
  >
>
type EmittedMixedCommandsRequirementsAreExact = Expect<
  EveryMemberEqual<
    Update.RequirementsOf<typeof mixedConnectedCommandsStep>,
    Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type EmittedMixedCommandsRegistrationIsExact = Expect<
  EveryMemberEqual<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof mixedConnectedCommandsStep>
    >,
    Block.RequirementOfBinding<typeof PlainBinding>
  >
>
type EmittedRegisteredMixedCommandsRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof mixedConnectedCommandsUpdate>,
    Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type EmittedPureMixedCommandsAreExact = Expect<
  Equal<
    typeof pureMixedCommandsLast,
    Update.Return<
      typeof ParentModel.Type,
      typeof ParentMessage.CompletedParentInitialization.Type,
      Command.HandlerOf<typeof CompleteParentInitialization>
    >
  >
>
type EmittedReversedPureMixedCommandsAreExact = Expect<
  Equal<typeof pureMixedCommandsFirst, typeof pureMixedCommandsLast>
>

const rejectRawMixedConnectedSteps = () => {
  // @ts-expect-error Emission retains the graph requirement beside a generic no-op.
  // oxfmt-ignore
  Update.combineSteps(initialParentModel, [PlainBinding.increment(), CompositionSafetyParentDefinition.makeNoopStep()])
  // @ts-expect-error Reversing emitted Steps cannot erase the connected graph requirement.
  // oxfmt-ignore
  Update.combineSteps(initialParentModel, [CompositionSafetyParentDefinition.makeNoopStep(), PlainBinding.increment()])
  // @ts-expect-error An emitted predeclared tuple retains the connected graph requirement.
  Update.combineSteps(initialParentModel, mixedConnectedSteps)
  // @ts-expect-error An emitted deferred combination still requires its registered Composition.
  deferredMixedConnectedStep(initialParentModel)
}
const rejectReadableMixedRecipe = (
  model: Parameters<typeof combinedMixedConnectedStep>[0],
) => {
  const combined = combinedMixedConnectedStep(model)

  // @ts-expect-error The emitted connected combination remains opaque.
  combined.model
  // @ts-expect-error The emitted combination cannot expose unresolved Commands.
  combined.commands
}
void rejectRawMixedConnectedSteps
void rejectReadableMixedRecipe

const initial = initialize()
const parentMessage = ParentMessage.CompletedParentInitialization()
foldStableProjected(initial.model, parentMessage, ChildMessage.Incremented())
foldPlain(initial.model, parentMessage, ChildMessage.Incremented())
StrictBlock.operations.initializeEntry(initialParentModel, 'emitted-entry', 2)
const appliedDerivedInitialization = initializeDerivedModel(
  initialParentModel,
  parentMessage,
)
appliedDerivedInitialization.model.first.count

type EmittedEntryInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializeEntryStep>,
    Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
  >
>
type EmittedParentCommandRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializePlainWithParentCommandsStep>,
    | Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
    | Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type EmittedParentCommandRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof initializePlainWithParentCommandsStep>
    >,
    | Block.RequirementOfBinding<typeof ParentCommandsBinding>
    | Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type EmittedEntryInitModelIsExact = Expect<
  Equal<
    RecipeModel<ReturnType<typeof initializeEntryStep>>,
    typeof ParentModel.Type
  >
>
type EmittedEntryInitMessageIsExact = Expect<
  Equal<
    RecipeMessage<ReturnType<typeof initializeEntryStep>>,
    typeof ParentMessage.Type
  >
>
type EmittedEntryInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initializeEntryStep>>,
    Block.RequirementOfBinding<typeof EntryBinding>
  >
>
type EmittedPlainInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initializePlainStep>>,
    Block.RequirementOfBinding<typeof PlainBinding>
  >
>
type EmittedParentCommandRecipeRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof makeParentCommandInitRecipe>,
    Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type EmittedParentCommandRecipeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof makeParentCommandInitRecipe>
    >,
    Block.RequirementOfBinding<typeof ParentCommandsBinding>
  >
>
type EmittedDerivedModelRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializeDerivedModel>,
    | Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
    | Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type EmittedDerivedModelRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof initializeDerivedStepsStep>
    >,
    | Block.RequirementOfBinding<typeof EntryBinding>
    | Block.RequirementOfBinding<typeof ParentCommandsBinding>
  >
>
declare const useSecondField: boolean

// @ts-expect-error Emitted accessor init projections retain one stable parent Model field.
// oxfmt-ignore
CompositionSafetyParentDefinition.makeBinding(PlainBlock, { placement: 'emittedUnstableProjected', read: model => Option.some(model.first), write: (model, nextChild) => Struct.modifyFields(model, { first: () => nextChild }),  init: { contextToArgs: () => [], toParentFields: child => useSecondField ? { second: child } : { first: child } } })

// @ts-expect-error Emitted optional update context requires an explicit delivery context mapper.
// oxfmt-ignore
CompositionSafetyParentDefinition.makeBinding(OptionalContextBlock, { field: 'optionalContext', })

// @ts-expect-error Emitted required rest update context requires an explicit delivery context mapper.
// oxfmt-ignore
CompositionSafetyParentDefinition.makeBinding(RestContextBlock, { field: 'restContext', })

// @ts-expect-error Emitted connected initializers require their parent configuration.
PlainBinding.init()

// @ts-expect-error Emitted keyed initializers reject the legacy positional form.
EntryBinding.init('entry', 1)

// @ts-expect-error Emitted initializer arguments preserve the child init tuple.
// oxfmt-ignore
EntryBinding.init({ key: 'entry', args: ['one'], toParentModel: child => Struct.modifyFields(initialParentModel, { entries: Array.append(Entry.make({ id: 'entry', child })) }) })

// @ts-expect-error Emitted keyed initializer keys preserve the Binding key type.
// oxfmt-ignore
EntryBinding.init({ key: 1, args: [1], toParentModel: child => Struct.modifyFields(initialParentModel, { entries: Array.append(Entry.make({ id: 'entry', child })) }) })

// @ts-expect-error Emitted initializer projections must construct the complete parent Model.
PlainBinding.init({ args: [], toParentModel: child => child })

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that an erased emitted parent Model cannot bypass validation.
declare const erasedParentModel: any
// @ts-expect-error Emitted initializers reject erased parent projections.
PlainBinding.init({ args: [], toParentModel: () => erasedParentModel })

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that an erased emitted Commands collection cannot bypass validation.
declare const erasedParentCommands: any
// @ts-expect-error Emitted initializers reject erased parent Commands collections.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: erasedParentCommands })

// oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that erased emitted Command elements cannot bypass validation.
declare const erasedParentCommandElements: ReadonlyArray<any>
// @ts-expect-error Emitted initializers reject erased parent Command elements.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: erasedParentCommandElements })

declare const erasedParentCommandRequirements: Update.Commands<
  typeof ParentMessage.Type,
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that erased emitted Command requirements cannot bypass validation.
  any
>
// @ts-expect-error Emitted initializers reject erased parent Command requirements.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: erasedParentCommandRequirements })

declare const unknownParentCommandRequirements: Update.Commands<
  typeof ParentMessage.Type,
  unknown
>
// @ts-expect-error Emitted initializers reject unknown parent Command requirements.
// oxfmt-ignore
PlainBinding.init({ args: [], toParentModel: child => Struct.modifyFields(initialParentModel, { plain: () => child }), commands: unknownParentCommandRequirements })

// @ts-expect-error Emitted explicit Steps cannot erase connected registration evidence.
const erasedEmittedConnectedStep: Update.Step<
  typeof ParentModel.Type,
  typeof ParentMessage.Type
> = initializePlainStep
void erasedEmittedConnectedStep

const EmittedMissingPlainBindingComposition =
  CompositionSafetyParentDefinition.makeComposition({
    bindings: [EntryBinding],
  })
EmittedMissingPlainBindingComposition.makeInit(() =>
  // @ts-expect-error A connected initializer cannot run without its registered Binding capability.
  initializePlainStep(initialParentModel),
)

const emittedDirectConnectedInit =
  EmittedMissingPlainBindingComposition.makeInit(() =>
    PlainBinding.init({
      args: [],
      toParentModel: child =>
        Struct.modifyFields(initialParentModel, { plain: () => child }),
    }),
  )
// @ts-expect-error Emitted directly connected initializers retain their missing Binding evidence.
EmittedMissingPlainBindingComposition.prepareBlock({
  init: emittedDirectConnectedInit,
  update: EmittedMissingPlainBindingComposition.makeUpdate({
    CompletedParentInitialization: model => ({
      model,
    }),
    RequestedInitializeEntry: model => ({
      model,
    }),
    RequestedInitializePlain: model => ({
      model,
    }),
    RequestedInitializePlainWithOwningParentCommand: model => ({
      model,
    }),
    RequestedInitializePlainWithParentCommands: model => ({
      model,
    }),
  }),
  EffectsLayer: LoadParameterizedChild.layer,
})

export type EmittedCompositionSafetyAssertions = [
  EmittedMixedConnectedRecipeIsExact,
  EmittedDeferredMixedRecipeIsExact,
  EmittedMixedRegistrationIsExact,
  EmittedReversedMixedResultIsExact,
  EmittedTupleMixedResultIsExact,
  EmittedDeferredMixedResultIsExact,
  EmittedExplicitGenericOrdinaryModelIsExact,
  EmittedExplicitGenericOrdinaryRequirementsAreExact,
  EmittedMixedCommandsModelIsExact,
  EmittedMixedCommandsMessageIsExact,
  EmittedMixedCommandsRequirementsAreExact,
  EmittedMixedCommandsRegistrationIsExact,
  EmittedRegisteredMixedCommandsRequirementsAreExact,
  EmittedPureMixedCommandsAreExact,
  EmittedReversedPureMixedCommandsAreExact,
  EmittedEntryInitRequirementsAreExact,
  EmittedParentCommandRequirementsAreExact,
  EmittedParentCommandRegistrationIsExact,
  EmittedEntryInitModelIsExact,
  EmittedEntryInitMessageIsExact,
  EmittedEntryInitRegistrationIsExact,
  EmittedPlainInitRegistrationIsExact,
  EmittedParentCommandRecipeRequirementsAreExact,
  EmittedParentCommandRecipeRegistrationIsExact,
  EmittedDerivedModelRequirementsAreExact,
  EmittedDerivedModelRegistrationIsExact,
]

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

const emptyPublicSteps = PublicUpdate.combineSteps(initialParentModel, [])
export type EmittedEmptyPlainStepsAssertions = [
  Expect<
    Equal<
      ReturnType<typeof emptyPlainSteps>,
      Update.Return<typeof PlainBlock.Model.Type, never>
    >
  >,
  Expect<
    Equal<
      typeof emptyPublicSteps,
      Update.Return<typeof ParentModel.Type, never>
    >
  >,
  Expect<
    Equal<
      ReturnType<typeof emptyPlainSteps>['model'],
      typeof PlainBlock.Model.Type
    >
  >,
  Expect<Equal<Update.RequirementsOf<typeof emptyPlainSteps>, never>>,
  Expect<
    Equal<
      Update.RegistrationEvidenceOf<ReturnType<typeof emptyPlainSteps>>,
      never
    >
  >,
  Expect<Equal<typeof emptyPublicSteps.model, typeof ParentModel.Type>>,
]
