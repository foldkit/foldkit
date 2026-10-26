import { Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  ParentBlock,
  ParentModel,
  Read,
  ReadService,
  RequiredBinding,
  init,
  setDefault,
  setDisabledStartup,
  setExplicitDefault,
  setGenericCount,
  setOptional,
  setParentOwnedOptional,
  setProjected,
  setRequired,
  setRequiredWithOptional,
  setRequiredWithRest,
  setStep,
} from './set-initialization.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ModelOf<Value> =
  Value extends Block.BindingInitRecipe<infer Model, unknown, unknown, unknown>
    ? Model
    : never
type ExpectedMessage = Readonly<{
  _tag: 'GotRequiredMessage'
  placement: 'required'
  generation: number
  message: typeof ChildBlock.Message.Type
}>
type ExpectedRequirements = Block.Qualify<
  'required',
  Command.HandlerOf<typeof Read>
>
type ExpectedRecipe = Block.BindingInitRecipe<
  typeof ParentModel.Type,
  ExpectedMessage,
  ExpectedRequirements,
  Block.RequirementOfBinding<typeof RequiredBinding>
>

export type ExactRecipe = Expect<
  Equal<ReturnType<typeof setRequired>, ExpectedRecipe>
>
export type OptionalArgumentsRecipe = Expect<
  Equal<ReturnType<typeof setRequiredWithOptional>, ExpectedRecipe>
>
export type RestArgumentsRecipe = Expect<
  Equal<ReturnType<typeof setRequiredWithRest>, ExpectedRecipe>
>
export type GenericArgumentsRecipe = Expect<
  Equal<ReturnType<typeof setGenericCount>, ExpectedRecipe>
>
export type OptionalStorageModel = Expect<
  Equal<ModelOf<ReturnType<typeof setOptional>>, typeof ParentModel.Type>
>
export type ProjectedStorageModel = Expect<
  Equal<ModelOf<ReturnType<typeof setProjected>>, typeof ParentModel.Type>
>
export type DefaultArgumentsModel = Expect<
  Equal<ModelOf<ReturnType<typeof setDefault>>, typeof ParentModel.Type>
>
export type ExplicitDefaultArgumentsModel = Expect<
  Equal<ModelOf<ReturnType<typeof setExplicitDefault>>, typeof ParentModel.Type>
>
export type DisabledStartupModel = Expect<
  Equal<ModelOf<ReturnType<typeof setDisabledStartup>>, typeof ParentModel.Type>
>
export type ParentOwnedOptionalModel = Expect<
  Equal<
    ModelOf<ReturnType<typeof setParentOwnedOptional>>,
    typeof ParentModel.Type
  >
>
export type ExactRequirements = Expect<
  Equal<Update.RequirementsOf<typeof setRequired>, ExpectedRequirements>
>
export type ExactEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof setRequired>>,
    Block.RequirementOfBinding<typeof RequiredBinding>
  >
>
export type StepRequirements = Expect<
  Equal<Update.RequirementsOf<typeof setStep>, ExpectedRequirements>
>
export type InitializedModel = Expect<
  Equal<ReturnType<typeof init>['model'], typeof ParentModel.Type>
>
export type ProviderServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ReadService>
>
