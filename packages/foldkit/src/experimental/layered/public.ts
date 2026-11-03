export { fromBlock, makeDefinition } from './runtime.js'
export type { Definition } from './definition.js'
export type {
  AuthoringComposition,
  BindingParent,
  MakeDescriptorOutMessageForward,
  MakeMapBinding,
  SourceContracts,
  StaticSource,
  ViewBuilderFor,
  YieldableBinding,
} from '../constructed/authoring.js'
export type { MapBindingResultConfig } from '../../block/mapBinding.js'
export type { SelectedChildBinding } from '../../block/bindChild.js'
export type {
  ConnectExecutable,
  ExecutableConnection as Connection,
  ExecutableHandle,
} from '../../block/bindingConnection.js'
export type {
  DefinedCaseSteps,
  OutMessageFold,
  OutMessageFoldStep,
} from '../../block/outMessageFold.js'
export type { Owner } from '../../block/owner.js'
export type { SubscriptionRequirementsEvidence } from '../../block/requirements.js'
export type { Plan, PlanOutput, ViewPlan } from '../hybrid/authoring.js'
export type {
  CoreContract,
  Executable,
  ExecutableOf,
  ExecutableReturn,
  ExecutableReturnWithOutMessage,
  FactsOf,
  Graph,
  ImplementationSubscriptions,
  ImplementationSubscriptionsOf,
  InternalExecution,
  LayeredDescriptor,
  OperationContract,
  PrivateDelivery,
  PrivateEncodedDelivery,
  PublicFacts,
  ResultContract,
  SubscriptionContract,
  ViewContract,
} from '../constructed/contract.js'

/** @internal Retains selected-child view-plan ownership in emitted declarations. */
export type { EmbeddedViewPlan } from '../../block/viewScope.js'

/** @internal Names alternate passive-view overloads in emitted Binding declarations. */
export type {
  DescriptorEmbedView,
  DescriptorViewExtension,
} from '../constructed/authoring.js'
