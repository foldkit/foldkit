import { Layer } from 'effect'
import type { Block, Command, Update } from 'foldkit'

import {
  ChildBlock,
  ChildrenByIdBinding,
  ChildrenByNumberBinding,
  Id,
  InitializingParentBlock,
  ParentBlock,
  ParentModel,
  Read,
  ReadService,
  init,
  initChildrenStep,
  initHashMapIfMissingStep,
  initRecordIfMissingStep,
  initWithChildren,
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

export type ExactInitializationInput = Expect<
  Equal<
    Parameters<typeof initRecordIfMissingStep>[0],
    typeof ParentModel.Type &
      Update.GraphCapability<
        typeof ParentModel.Type,
        Block.RequirementOfBinding<typeof ChildrenByIdBinding>
      >
  >
>
export type ExactInitializationRecipe = Expect<
  Equal<
    ReturnType<typeof initRecordIfMissingStep>,
    Update.ResultRecipe<
      typeof ParentModel.Type,
      ExpectedMessage,
      never,
      ExpectedRequirements,
      Block.RequirementOfBinding<typeof ChildrenByIdBinding>
    >
  >
>
export type ExactInitializationRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initRecordIfMissingStep>,
    ExpectedRequirements
  >
>
export type ExactInitializationEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initRecordIfMissingStep>>,
    Block.RequirementOfBinding<typeof ChildrenByIdBinding>
  >
>
export type ExactHashMapInitializationRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initHashMapIfMissingStep>,
    ExpectedHashMapRequirements
  >
>
export type ComposedInitializationRequirements = Expect<
  Equal<Update.RequirementsOf<typeof initChildrenStep>, ExpectedRequirements>
>
export type ReusedInitializedModel = Expect<
  Equal<ReturnType<typeof initWithChildren>['model'], typeof ParentModel.Type>
>
export type InitializationProviderServices = Expect<
  Equal<
    Layer.Services<typeof InitializingParentBlock.EffectsLayer>,
    ReadService
  >
>
