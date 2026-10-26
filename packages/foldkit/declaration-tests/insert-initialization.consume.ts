import { Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  ChildrenByIdBinding,
  ChildrenByNumberBinding,
  Id,
  ParentBlock,
  ParentModel,
  Read,
  ReadService,
  init,
  insertHashMap,
  insertRecord,
  insertStep,
} from './insert-initialization.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ExpectedMessage = Readonly<{
  _tag: 'GotChildrenByIdMessage'
  placement: 'childrenById'
  generation: number
  key: typeof Id.Type
  message: typeof ChildBlock.Message.Type
}>
type ExpectedRequirements = Block.Qualify<
  'childrenById',
  Command.HandlerOf<typeof Read>
>
type ExpectedRecipe = Block.BindingInitRecipe<
  typeof ParentModel.Type,
  ExpectedMessage,
  ExpectedRequirements,
  Block.RequirementOfBinding<typeof ChildrenByIdBinding>
>
type ExpectedHashMapMessage = Readonly<{
  _tag: 'GotChildrenByNumberMessage'
  placement: 'childrenByNumber'
  generation: number
  key: number
  message: typeof ChildBlock.Message.Type
}>
type ExpectedHashMapRequirements = Block.Qualify<
  'childrenByNumber',
  Command.HandlerOf<typeof Read>
>
type ExpectedHashMapRecipe = Block.BindingInitRecipe<
  typeof ParentModel.Type,
  ExpectedHashMapMessage,
  ExpectedHashMapRequirements,
  Block.RequirementOfBinding<typeof ChildrenByNumberBinding>
>

export type ExactRecipe = Expect<
  Equal<ReturnType<typeof insertRecord>, ExpectedRecipe>
>
export type ExactHashMapRecipe = Expect<
  Equal<ReturnType<typeof insertHashMap>, ExpectedHashMapRecipe>
>
export type ExactRequirements = Expect<
  Equal<Update.RequirementsOf<typeof insertRecord>, ExpectedRequirements>
>
export type ExactEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof insertRecord>>,
    Block.RequirementOfBinding<typeof ChildrenByIdBinding>
  >
>
export type ExactHashMapRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof insertHashMap>,
    ExpectedHashMapRequirements
  >
>
export type ExactHashMapEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof insertHashMap>>,
    Block.RequirementOfBinding<typeof ChildrenByNumberBinding>
  >
>
export type StepRequirements = Expect<
  Equal<Update.RequirementsOf<typeof insertStep>, ExpectedRequirements>
>
export type InitializedModel = Expect<
  Equal<ReturnType<typeof init>['model'], typeof ParentModel.Type>
>
export type ProviderServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ReadService>
>
