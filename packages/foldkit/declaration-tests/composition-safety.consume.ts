import { Array, Option } from 'effect'
import { Block, Command, Struct, Update } from 'foldkit'
import * as PublicUpdate from 'foldkit/update'

import {
  ChildMessage,
  CompleteParentInitialization,
  CompositionSafetyParent,
  Entry,
  EntryBinding,
  LoadParameterizedChild,
  OptionalContextBlock,
  ParameterizedBlock,
  ParentMessage,
  ParentModel,
  PlainBinding,
  PlainBlock,
  RestContextBlock,
  StrictBlock,
  foldPlain,
  foldStableProjected,
  initialParentModel,
  initialize,
  initializeEntry,
  initializePlain,
  initializePlainWithParentCommands,
  makeParentCommandInitRecipe,
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

const initial = initialize()
const parentMessage = ParentMessage.CompletedParentInitialization()
foldStableProjected(initial.model, parentMessage, ChildMessage.Incremented())
foldPlain(initial.model, parentMessage, ChildMessage.Incremented())
StrictBlock.expose.initializeEntry(initialParentModel, 'emitted-entry', 2)

type EmittedEntryInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializeEntry>,
    Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
  >
>
type EmittedParentCommandRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof initializePlainWithParentCommands>,
    | Block.Qualify<'entries', Command.HandlerOf<typeof LoadParameterizedChild>>
    | Command.HandlerOf<typeof CompleteParentInitialization>
  >
>
type EmittedParentCommandRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<
      ReturnType<typeof initializePlainWithParentCommands>
    >,
    | Block.BindingRequirement<'parentCommands', typeof PlainBlock>
    | Block.BindingRequirement<'entries', typeof ParameterizedBlock>
  >
>
type EmittedEntryInitModelIsExact = Expect<
  Equal<
    ReturnType<typeof initializeEntry>,
    Update.ResultRecipe<
      typeof ParentModel.Type,
      typeof ParentMessage.Type,
      never,
      Block.Qualify<
        'entries',
        Command.HandlerOf<typeof LoadParameterizedChild>
      >,
      Block.BindingRequirement<'entries', typeof ParameterizedBlock>
    >
  >
>
type EmittedPlainInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initializePlain>>,
    Block.BindingRequirement<'plain', typeof PlainBlock>
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
    Block.BindingRequirement<'parentCommands', typeof PlainBlock>
  >
>

declare const useSecondField: boolean

// @ts-expect-error Emitted accessor init projections retain one stable parent Model field.
// oxfmt-ignore
CompositionSafetyParent.bindChild(PlainBlock, { placement: 'emittedUnstableProjected', read: model => Option.some(model.first), write: (model, nextChild) => Struct.modifyFields(model, { first: () => nextChild }), parentMessage: ParentMessage.RoutedProjectedMessage, init: { args: () => [], model: child => useSecondField ? { second: child } : { first: child } } })

// @ts-expect-error Emitted optional update context requires an explicit incoming Message route.
// oxfmt-ignore
CompositionSafetyParent.bindChild(OptionalContextBlock, { field: 'optionalContext', parentMessage: ParentMessage.RoutedOptionalContextMessage })

// @ts-expect-error Emitted required rest update context requires an explicit incoming Message route.
// oxfmt-ignore
CompositionSafetyParent.bindChild(RestContextBlock, { field: 'restContext', parentMessage: ParentMessage.RoutedRestContextMessage })

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
> = initializePlain
void erasedEmittedConnectedStep

const EmittedMissingPlainBindingComposition =
  CompositionSafetyParent.makeComposition({ childBindings: [EntryBinding] })
EmittedMissingPlainBindingComposition.makeInit(() =>
  // @ts-expect-error A connected initializer cannot run without its registered Binding capability.
  initializePlain(initialParentModel),
)

const emittedDirectConnectedInit =
  EmittedMissingPlainBindingComposition.makeInit(() =>
    PlainBinding.init({
      args: [],
      toParentModel: child =>
        Struct.modifyFields(initialParentModel, { plain: () => child }),
    }),
  )
EmittedMissingPlainBindingComposition.makeBlock({
  init: emittedDirectConnectedInit,
  update: EmittedMissingPlainBindingComposition.makeUpdate(model => ({
    model,
  })),
  // @ts-expect-error Emitted directly connected initializers retain their missing Binding evidence.
  EffectsLayer: LoadParameterizedChild.layer,
})

export type EmittedCompositionSafetyAssertions = [
  EmittedEntryInitRequirementsAreExact,
  EmittedParentCommandRequirementsAreExact,
  EmittedParentCommandRegistrationIsExact,
  EmittedEntryInitModelIsExact,
  EmittedPlainInitRegistrationIsExact,
  EmittedParentCommandRecipeRequirementsAreExact,
  EmittedParentCommandRecipeRegistrationIsExact,
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
