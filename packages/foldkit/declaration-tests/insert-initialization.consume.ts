import { Layer, type Option } from 'effect'
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
  ZeroChildrenByIdBinding,
  ZeroParentModel,
  init,
  initChildren,
  initHashMapFromEntity,
  initHashMapIfMissing,
  initRecordFromEntity,
  initRecordFromExtractedProducer,
  initRecordFromModel,
  initRecordIfMissing,
  initWithChildren,
  initZeroChildFromProducer,
  insert,
  insertHashMap,
  insertRecord,
  recordInitProducer,
  skipRecordInitialization,
} from './insert-initialization.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type RecipeMessage<Recipe> =
  Recipe extends Update.ResultRecipe<
    infer _Model,
    infer Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Message
    : never
type RecipeOutMessage<Recipe> =
  Recipe extends Update.ResultRecipe<
    infer _Model,
    infer _Message,
    infer OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? OutMessage
    : never
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
  Equal<Update.RequirementsOf<typeof insert>, ExpectedRequirements>
>
export type InitializedModel = Expect<
  Equal<ReturnType<typeof init>['model'], typeof ParentModel.Type>
>
export type ProviderServices = Expect<
  Equal<Layer.Services<typeof ParentBlock.EffectsLayer>, ReadService>
>

export type ExactInitializationInput = Expect<
  Equal<
    Parameters<typeof initRecordIfMissing>[0],
    typeof ParentModel.Type &
      Update.GraphCapability<
        typeof ParentModel.Type,
        Block.RequirementOfBinding<typeof ChildrenByIdBinding>
      >
  >
>
export type ExactInitializationRecipe = Expect<
  Equal<
    ReturnType<typeof initRecordIfMissing>,
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
  Equal<Update.RequirementsOf<typeof initRecordIfMissing>, ExpectedRequirements>
>
export type ExactInitializationEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initRecordIfMissing>>,
    Block.RequirementOfBinding<typeof ChildrenByIdBinding>
  >
>
export type ExactHashMapInitializationRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initHashMapIfMissing>,
    ExpectedHashMapRequirements
  >
>
export type ExactProducerModel = Expect<
  Equal<Parameters<typeof recordInitProducer>[0], typeof ParentModel.Type>
>
export type ExactProducerOutput = Expect<
  Equal<
    ReturnType<typeof recordInitProducer>,
    Option.Option<
      Readonly<{
        key: typeof Id.Type
        args: [count: number, label?: string, ...labels: ReadonlyArray<string>]
      }>
    >
  >
>
export type ExactEntityInitializationInput = Expect<
  Equal<
    Parameters<typeof initRecordFromEntity>[0],
    Parameters<typeof initRecordIfMissing>[0]
  >
>
export type ExactEntityInitializationRecipe = Expect<
  Equal<
    ReturnType<typeof initRecordFromEntity>,
    ReturnType<typeof initRecordIfMissing>
  >
>
export type ExactModelInitializationRecipe = Expect<
  Equal<
    ReturnType<typeof initRecordFromModel>,
    ReturnType<typeof initRecordIfMissing>
  >
>
export type ExactExtractedInitializationRecipe = Expect<
  Equal<
    ReturnType<typeof initRecordFromExtractedProducer>,
    ReturnType<typeof initRecordIfMissing>
  >
>
export type ExactSkippedInitializationRecipe = Expect<
  Equal<
    ReturnType<typeof skipRecordInitialization>,
    ReturnType<typeof initRecordIfMissing>
  >
>
export type ExactProducerMessage = Expect<
  Equal<RecipeMessage<ReturnType<typeof initRecordFromEntity>>, ExpectedMessage>
>
export type ProducerHasNoOutMessage = Expect<
  Equal<RecipeOutMessage<ReturnType<typeof initRecordFromEntity>>, never>
>
export type ExactProducerRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initRecordFromEntity>,
    ExpectedRequirements
  >
>
export type ExactProducerEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initRecordFromEntity>>,
    Block.RequirementOfBinding<typeof ChildrenByIdBinding>
  >
>
export type ExactHashMapProducerRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof initHashMapFromEntity>,
    ExpectedHashMapRequirements
  >
>
export type ExactHashMapProducerEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initHashMapFromEntity>>,
    Block.RequirementOfBinding<typeof ChildrenByNumberBinding>
  >
>
export type ExactZeroProducerInput = Expect<
  Equal<
    Parameters<typeof initZeroChildFromProducer>[0],
    typeof ZeroParentModel.Type &
      Update.GraphCapability<
        typeof ZeroParentModel.Type,
        Block.RequirementOfBinding<typeof ZeroChildrenByIdBinding>
      >
  >
>
export type ExactZeroProducerRequirements = Expect<
  Equal<Update.RequirementsOf<typeof initZeroChildFromProducer>, never>
>
export type ExactZeroProducerEvidence = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof initZeroChildFromProducer>>,
    Block.RequirementOfBinding<typeof ZeroChildrenByIdBinding>
  >
>
export type ZeroProducerHasNoOutMessage = Expect<
  Equal<RecipeOutMessage<ReturnType<typeof initZeroChildFromProducer>>, never>
>
export type ComposedInitializationRequirements = Expect<
  Equal<Update.RequirementsOf<typeof initChildren>, ExpectedRequirements>
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
