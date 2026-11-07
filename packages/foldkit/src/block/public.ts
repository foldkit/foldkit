import type { Schema } from 'effect'

import type { InstanceEvidence } from './instanceSchema.js'

export type {
  AnyAuthoredView,
  AnyDocumentView,
  AnyBlockView,
  BoundBlockView,
  BoundBlockFields,
  BoundBlockConfigEvidence,
  DocumentView,
  BoundBlockConfig as Config,
  BlockView as View,
  ViewMountRequirementsOf,
} from '../html/block.js'
export type {
  AnyBinding,
  Binding,
  BindingEvidence,
  BindingStorageEvidence,
  BindingInitializer,
  BindingInspection,
  InspectionOfBinding,
  BindingRequirement,
  BindingReturn,
  BlockOfBinding,
  OutMessagePolicy,
  ParentBindingContract,
  RequirementOfBinding,
  RequirementsOfBindings,
  ValidateEmbeddedViewMounts,
  WithoutBindingEvidence,
} from './binding.js'
export { inspectBinding } from './binding.js'
export type {
  ConnectExecutable,
  ExecutableBinding,
} from './bindingConnection.js'
export type { BindingInitRecipe } from './initRecipe.js'
/** A ready child occurrence with a stable string key and its child's Model. */
export type ChildInstance<OwnerValue, Model> = Readonly<{
  key: string
  model: Model
}> &
  InstanceEvidence<OwnerValue>

/** Schema for a ready child occurrence in standard string-keyed array storage. */
export interface InstanceSchema<
  OwnerValue,
  ModelSchema extends Schema.Top,
> extends Schema.Struct<{
  key: Schema.String
  model: ModelSchema
}> {
  readonly Rebuild: InstanceSchema<OwnerValue, ModelSchema>
  readonly Type: ChildInstance<OwnerValue, ModelSchema['Type']>
  readonly '~type.make': ChildInstance<OwnerValue, ModelSchema['Type']>
  readonly Iso: ChildInstance<OwnerValue, ModelSchema['Iso']>
}

export type { AssemblyDraft } from './assemblyState.js'
export type { MakeMapBinding, MapBindingResultConfig } from './mapBinding.js'
export type {
  BindSingularChild,
  BindFieldChild,
  BindCustomKeyedChild,
  BindingWithoutOutMessagePolicy,
  SelectedChildBinding,
  UnselectedOutMessagePolicy,
  WithOutMessagePolicy,
} from './bindChild.js'
export type {
  BindingDeliveryEvidence,
  DefineCompositionUpdate,
} from './delivery.js'
export type {
  InitialBindingEvidence,
  CompositionInit,
  InitializationPlan,
  InitializationStep,
} from './initialization.js'
export { LocalMountsTypeId } from './definition.js'
export type {
  AnyBlock,
  Base,
  MakeComposition,
  Composition,
  Completed,
  CompletedUpdate,
  CompletedBlock,
  CompletedBlockWithOutMessage,
  CompletedBlockWithView,
  CompletedBlockWithViewAndOutMessage,
  CompletedBlockWithoutViewOrOutMessage,
  CompletedWithViewAndOutMessage,
  CompletedWithView,
  Definition,
  DefinitionAuthoredView,
  DefinitionView,
  DefineBlock,
  DefineManagedResources,
  DefinedStep,
  DefinedUpdate,
  DefinedUpdateSource,
  DefineStep,
  DefineSubscriptions,
  DefineView,
  Block,
  Implementation,
  InvalidViewInputs,
  OwnedAuthoredView,
  OwnedDocumentView,
  PrepareBlock,
  AuthoredViewInputs,
  OwnedManagedResourceEntryBuilder,
  OwnedManagedResourceRegistry,
  OwnedSubscriptionEntryBuilder,
  OwnedSubscriptionRegistry,
  RefineViewInputs,
} from './definition.js'
export { makeNamespace } from './makeNamespace.js'
export type { Namespace, NamespaceMakeDefinition } from './makeNamespace.js'
export { makeDefinition } from './makeDefinition.js'
/** Declares one Block and binds its authoring helpers to that contract. */
export { makeUnifiedBlock as make } from '../experimental/contracted/unified.js'
/** @internal Names the unified authoring surface in downstream declarations. */
export type {
  UnifiedBlockFields,
  UnifiedBlock,
} from '../experimental/contracted/unified.js'
/** @internal Names inferred input contracts in downstream declarations. */
export type {
  BaseDefinition,
  ImplementationFacts,
  SelectedImplementationFacts,
  DeclaredFacts,
  InMessageDefinition,
  MakeComposition as ContractMakeComposition,
} from '../experimental/contracted/contract.js'
/** @internal Names an authored input update without expanding its handler implementations. */
export type {
  InMessageUpdateHandler,
  MakeInMessageUpdatePlan,
} from '../experimental/contracted/inMessageUpdate.js'
export type { ViewBuilderFor } from './viewBuilder.js'
export { makeInputContract } from '../experimental/contracted/inputContract.js'
export type {
  InputContract,
  InputOf,
} from '../experimental/contracted/inputContract.js'
export { makeEffectsContract } from '../experimental/contracted/effectsContract.js'
export type {
  EffectsContract,
  EffectsErrorOf,
  EffectsRequirementsOf,
} from '../experimental/contracted/effectsContract.js'
export {
  makeFamilyDefinition,
  makeFamilyContract,
  familyLifetime,
} from '../experimental/contracted/family.js'
export type {
  FamilyDefinition,
  FamilyRecipe,
  FamilyLifetime,
  FamilyContract,
  FamilyContractOf,
} from '../experimental/contracted/family.js'
export type {
  Block as ContractBlock,
  Contract,
  ContractComposition,
  ContractConfiguration,
  ContractGraph,
  ContractOperations,
  Definition as ContractDefinition,
  MakeBlock,
  MakeInit,
  MakeView,
  NominalId,
  OperationDeclaration,
} from '../experimental/contracted/contract.js'
export type {
  CoreContract,
  DescriptorContract,
  Executable,
  ExecutableOf,
  ExecutableInMessageUpdate,
  ExecutableReturn,
  ExecutableReturnWithOutMessage,
  FactsOf,
  InternalExecution,
  OperationContract,
  PrivateDelivery,
  PrivateEncodedDelivery,
  ResultContract,
  SubscriptionContract,
  ViewContract,
} from '../experimental/constructed/contract.js'
export type {
  BindingParent,
  MakeSingularBinding,
  MakeFieldBinding,
  MakeCustomKeyedBinding,
  MakeDescriptorOutMessageFold,
  MakeDescriptorOutMessageForward,
  StaticSource,
  StaticSourceFields,
  YieldableBinding,
} from '../experimental/constructed/authoring.js'
/** @internal Names the descriptor Map Binding factory without replacing the native factory. */
export type { MakeMapBinding as DescriptorMakeMapBinding } from '../experimental/constructed/authoring.js'
/** @internal Keeps exact portable Binding contracts nameable in downstream declarations. */
export type {
  BindingChildContract,
  DescriptorBinding,
  DescriptorBindingFields,
  DescriptorBindingMember,
  DescriptorBindingPolicyFields,
  DescriptorBindingPolicySelector,
  DescriptorBindingWithPolicyFields,
  ParentDescriptorBindingFields,
} from '../experimental/constructed/bindingContract.js'
/** @internal Names the exact child-routing channels retained by portable update plans. */
export type { CompositionRouteChannels } from './delivery.js'
export type {
  CanonicalUpdatePlan,
  Plan,
  ViewPlan,
} from '../experimental/hybrid/authoring.js'
/** @internal Keeps inferred focused and composed update plans nameable in declarations. */
export type {
  CompositionMetadata,
  InMessageAuthoringSource,
  MakeComposableUpdatePlan,
  UpdateStage,
} from '../experimental/hybrid/updateComposition.js'
export type { RuntimeCapability } from './runtimeCapability.js'
export type { DefineStepFields, DefineStepNoop } from './fieldStep.js'
export type { CommandsStep, MakeCommandsStep } from './commandsStep.js'
/** @internal Keeps extracted field helpers nameable in consumer declarations. */
export type {
  FocusedObjectStepFields,
  MessageFreeObjectStepFields,
} from './fieldStep.js'
/** @internal Keeps extracted Command helpers nameable in consumer declarations. */
export type { FocusedMakeCommandsStep } from './commandsStep.js'
export type { OutMessageStep, MakeOutMessageStep } from './outMessageStep.js'
/** @internal Keeps extracted OutMessage helpers nameable in consumer declarations. */
export type { FocusedMakeOutMessageStep } from './outMessageStep.js'
export type {
  AuthoringDefinition,
  AuthoringMakeComposition,
  Primitives,
} from './define.js'
export type {
  DefineCommand,
  DefineMount,
  DefineMountStream,
  DefineResource,
} from './named.js'
export type { KeyedBinding, KeyedOutMessagePolicy } from './keyedBinding.js'
export type { Owner } from './owner.js'
export type { Qualify, Scoped } from './scope.js'
export type { BindingPolicyEvidence } from './policyEvidence.js'
export type { OperationOutputs } from './operationOutputs.js'
export type { OperationEmission } from './operationEmission.js'
export type { DeferredBindingPolicy } from './deferredPolicy.js'
export type {
  DefinedCaseSteps,
  MakeOutMessageFold,
  OutMessageFold,
  OutMessageFoldStep,
} from './outMessageFold.js'
export type {
  FoldOptionalMutableRegistration,
  FoldOptionalReadonlyRegistration,
  FoldRequiredMutableRegistration,
  FoldRequiredReadonlyRegistration,
  NormalizedFoldCaseData,
  NormalizedFoldContextData,
  NormalizedFoldEvidence,
  NormalizedFoldStep,
  NormalizedOutMessageFold,
  RestoredFoldContext,
} from './outMessageFoldContract.js'
export type {
  MakeOutMessageForward,
  OutMessageForward,
} from './outMessageForward.js'
export type { ValidateConcreteComposition } from './requirements.js'
export type { InstanceKey } from './instanceContext.js'
export type {
  OperationMessageConstructor,
  OperationParameters,
  OperationPayload,
} from './operation.js'

export type {
  AssemblyWithView,
  AssemblyWithOutMessage,
  AssemblyWithViewAndOutMessage,
  AssemblyWithoutViewOrOutMessage,
  FromAssemblyWithView,
  FromAssemblyWithOutMessage,
  FromAssemblyWithViewAndOutMessage,
  FromAssemblyWithoutViewOrOutMessage,
} from './fromAssembly.js'
export { assemble } from './fromAssembly.js'

/** @internal Retains selected-child view-plan ownership in emitted declarations. */
export type { EmbeddedViewPlan } from './viewScope.js'

/** @internal Retains original shared-namespace identity in family authoring signatures. */
export type { NamespaceIdentity } from './namespaceIdentity.js'

/** @internal Names alternate passive-view overloads in emitted Binding declarations. */
export type {
  DescriptorEmbedView,
  DescriptorViewExtension,
} from '../experimental/constructed/authoring.js'

/** @internal Names native view-channel projection in emitted descriptor Binding declarations. */
export type { BindingViewContract } from './bindChild.js'

/** @internal Closed library-family metadata retained in emitted UI contracts. */
export type {
  FixedRefinement,
  FixedRefinementProvider,
  SelectedPublicIdentity,
} from '../experimental/contracted/implementationFacts.js'
/** @internal Private reader admission for closed library providers. */
export type {
  ClosedFamilyCapability,
  ReadableProvider,
  ExactReadable,
  FamilyReaderCapability,
  FamilySelection,
  ValidateReadableAdmission,
  ReadableAdmissionValidation,
} from '../experimental/contracted/readableProvider.js'

/** @internal Retains exact selected-handler facts in emitted declarations. */
export type { WithoutPendingHandlers } from '../experimental/contracted/contract.js'
/** @internal Names an acquired connection returned from a portable Binding. */
export type { ExecutableConnection } from './bindingConnection.js'

export type {
  DescriptorBindingSpec,
  FoldOnlyPolicySpec,
  BindingSpecs,
  BindingsFromSpecs,
} from '../experimental/constructed/bindingContract.js'

export type {
  AuthoredViewPlan,
  AuthoredDocumentViewPlan,
} from '../experimental/contracted/contract.js'

export type { AuthoredInitPlan } from '../experimental/contracted/contract.js'
export type { AuthoredUpdatePlan } from '../experimental/hybrid/authoring.js'

/** @internal Names the parent-specialized relationship authoring contracts. */
export type { NativeRelationshipConstructors } from './bindingAuthoring.js'
/** @internal Names portable constructor-authored relationship methods. */
export type { RelationshipConstructors } from '../experimental/constructed/relationshipAuthoring.js'
/** @internal Names inferred whole-variant callables without exposing private module paths. */
export type {
  OwnedContractVariantBinding,
  OwnedNativeVariantBinding,
} from './variantBinding.js'
