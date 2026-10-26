import { Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  EntryBinding,
  Id,
  ParentBlock,
  ParentModel,
  Read,
  ReadService,
  init,
  setEntry,
  setEntryStep,
  setEntryWithOptional,
  setEntryWithRest,
  setGenericEntry,
} from './set-optional-initialization.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ExpectedMessage = Readonly<{
  _tag: 'GotDeclarationOptionalSetChildMessage'
  placement: 'DeclarationOptionalSetChild'
  generation: number
  key: typeof Id.Type
  message: typeof ChildBlock.Message.Type
}>
type ExpectedRequirements = Block.Qualify<
  'DeclarationOptionalSetChild',
  Command.HandlerOf<typeof Read>
>
type ExpectedRecipe = Block.BindingInitRecipe<
  typeof ParentModel.Type,
  ExpectedMessage,
  ExpectedRequirements,
  Block.RequirementOfBinding<typeof EntryBinding>
>

export type ExactRecipe = Expect<
  Equal<ReturnType<typeof setEntry>, ExpectedRecipe>
>
export type OptionalArgumentsRecipe = Expect<
  Equal<ReturnType<typeof setEntryWithOptional>, ExpectedRecipe>
>
export type RestArgumentsRecipe = Expect<
  Equal<ReturnType<typeof setEntryWithRest>, ExpectedRecipe>
>
export type GenericArgumentsRecipe = Expect<
  Equal<ReturnType<typeof setGenericEntry>, ExpectedRecipe>
>
export type ExactRequirements = Expect<
  Equal<Update.RequirementsOf<typeof setEntry>, ExpectedRequirements>
>
export type ExactEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof setEntry>>,
    Block.RequirementOfBinding<typeof EntryBinding>
  >
>
export type StepRequirements = Expect<
  Equal<Update.RequirementsOf<typeof setEntryStep>, ExpectedRequirements>
>
export type InitializedModel = Expect<
  Equal<ReturnType<typeof init>['model'], typeof ParentModel.Type>
>
export type ProviderServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ReadService>
>
