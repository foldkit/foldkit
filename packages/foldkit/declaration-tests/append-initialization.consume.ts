import { Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  EntriesBinding,
  Id,
  ParentBlock,
  ParentModel,
  Read,
  ReadService,
  append,
  appendStep,
  appendWithRequiredArgs,
  init,
} from './append-initialization.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ExpectedMessage = Readonly<{
  _tag: 'GotDeclarationAppendChildMessage'
  placement: 'DeclarationAppendChild'
  generation: number
  key: typeof Id.Type
  message: typeof ChildBlock.Message.Type
}>
type ExpectedRequirements = Block.Qualify<
  'DeclarationAppendChild',
  Command.HandlerOf<typeof Read>
>
type ExpectedRecipe = Block.BindingInitRecipe<
  typeof ParentModel.Type,
  ExpectedMessage,
  ExpectedRequirements,
  Block.RequirementOfBinding<typeof EntriesBinding>
>

export type ExactRecipe = Expect<
  Equal<ReturnType<typeof append>, ExpectedRecipe>
>
export type RequiredArgsRecipe = Expect<
  Equal<ReturnType<typeof appendWithRequiredArgs>, ExpectedRecipe>
>
export type ExactRequirements = Expect<
  Equal<Update.RequirementsOf<typeof append>, ExpectedRequirements>
>
export type ExactEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof append>>,
    Block.RequirementOfBinding<typeof EntriesBinding>
  >
>
export type StepRequirements = Expect<
  Equal<Update.RequirementsOf<typeof appendStep>, ExpectedRequirements>
>
export type InitializedModel = Expect<
  Equal<ReturnType<typeof init>['model'], typeof ParentModel.Type>
>
export type ProviderServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ReadService>
>
