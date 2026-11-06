import type { Effect, Schema } from 'effect'

import type {
  BindChildResultForConfig,
  BindingViewContract,
  ContextualOutMessagePolicy,
  OutMessagePolicyForBindingConfig,
  PlacementOfConfig,
  StorageOfConfig,
  UnselectedOutMessagePolicy,
  ValidateOutMessageHelperPolicy,
} from '../../block/bindChild.js'
import type {
  AnyBinding,
  BindingStorageEvidence,
  ParentBindingContract,
} from '../../block/binding.js'
import type {
  BindingParent,
  ConnectExecutable,
  ExecutableBinding,
} from '../../block/bindingConnection.js'
import type { InitialBindingEvidence } from '../../block/initialization.js'
import type { InstanceEvidence } from '../../block/instanceSchema.js'
import type { OccurrenceCreation } from '../../block/occurrence.js'
import type {
  NormalizedFoldEvidence,
  NormalizedOutMessageFold,
  RestoredFoldContext,
} from '../../block/outMessageFoldContract.js'
import type { OutMessageHelperEvidence } from '../../block/outMessageHelperEvidence.js'
import type { BindingPolicyEvidence } from '../../block/policyEvidence.js'
import type { Qualify } from '../../block/scope.js'
import type * as Update from '../../update/index.js'
import type {
  BindingConstructor,
  ConstructionKind,
  DescriptorViewExtension,
  YieldableBinding,
} from './authoring.js'
import type {
  DescriptorContract as AnyDescriptor,
  ConstructorEffectOf,
  CoreContract,
  DescriptorTypeId,
  PublicFacts,
} from './contract.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

/** @internal Names a Binding's selected public child contract in declarations. */
export interface BindingChildContract<
  OwnerValue extends AnyDescriptor['owner'],
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Facts extends PublicFacts,
  Acquisition,
> {
  readonly owner: OwnerValue
  readonly Model: ModelSchema
  readonly Message: MessageSchema
  readonly OutMessage: OutSchema
  readonly [DescriptorTypeId]: Facts
  readonly get: Acquisition
}

/** @internal Checks each Binding's parent ownership without comparing tuple authoring methods. */
export type ValidateBindingParents<
  Bindings extends ReadonlyArray<AnyBinding>,
  ParentOwner,
> = [Exclude<Bindings[number], BindingParent<ParentOwner>>] extends [never]
  ? unknown
  : Readonly<{
      'Block child bindings must belong to this Definition': Exclude<
        Bindings[number],
        BindingParent<ParentOwner>
      >
    }>

type ChildInitContext<SchemaValue> = SchemaValue extends AnySchema
  ? SchemaValue['Type']
  : never

type NativeDescriptorBinding<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Policy,
> = BindChildResultForConfig<
  CoreContract<Child>,
  ModelSchema,
  MessageSchema,
  OutSchema,
  Config &
    ([Policy] extends [never] ? unknown : Readonly<{ outMessage: Policy }>),
  ChildInitContext<InitSchema>
>

/** @internal Retains native Binding metadata and the selected child connection without expanding its implementation. */
export interface DescriptorBindingFields<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  ParentOwner,
  Policy,
>
  extends
    Pick<
      NativeDescriptorBinding<
        Child,
        ModelSchema,
        MessageSchema,
        OutSchema,
        Config,
        InitSchema,
        Policy
      >,
      Exclude<keyof AnyBinding, 'embedView'>
    >,
    BindingParent<ParentOwner>,
    BindingPolicyEvidence<Policy>,
    BindingStorageEvidence<StorageOfConfig<Config>>,
    ExecutableBinding<
      CoreContract<Child>,
      PlacementOfConfig<CoreContract<Child>, Config>
    > {
  readonly embedView: DescriptorViewExtension<
    Child,
    ModelSchema,
    MessageSchema,
    Config
  >['embedView'] &
    NativeDescriptorBinding<
      Child,
      ModelSchema,
      MessageSchema,
      OutSchema,
      Config,
      InitSchema,
      never
    >['embedView']
  readonly connect: ConnectExecutable<
    CoreContract<Child>,
    PlacementOfConfig<CoreContract<Child>, Config>
  >
}

type ParentModelOfBinding<Native> =
  Native extends ParentBindingContract<infer Model, any, any> ? Model : never

type ParentMessageOfBinding<Native> =
  Native extends ParentBindingContract<any, infer Message, any>
    ? Message
    : never

type ParentOutMessageOfBinding<Native> =
  Native extends ParentBindingContract<any, any, infer OutMessage>
    ? OutMessage
    : never

/** @internal Preserves the exact native parent contract alongside the child connection. */
export interface ParentDescriptorBindingFields<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  ParentOwner,
  Policy,
>
  extends
    DescriptorBindingFields<
      Child,
      ModelSchema,
      MessageSchema,
      OutSchema,
      Config,
      InitSchema,
      ParentOwner,
      Policy
    >,
    ParentBindingContract<
      ParentModelOfBinding<
        NativeDescriptorBinding<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          Policy
        >
      >,
      ParentMessageOfBinding<
        NativeDescriptorBinding<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          Policy
        >
      >,
      ParentOutMessageOfBinding<
        NativeDescriptorBinding<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          Policy
        >
      >
    > {}

/** @internal Retains the exact parent contract while selecting a child OutMessage policy. */
export interface DescriptorBindingWithPolicyFields<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy,
> extends ParentDescriptorBindingFields<
  Child,
  ModelSchema,
  MessageSchema,
  OutSchema,
  Config,
  InitSchema,
  ParentOwner,
  Policy
> {
  readonly withOutMessagePolicy: DescriptorBindingPolicySelector<
    Child,
    ModelSchema,
    MessageSchema,
    OutSchema,
    Config,
    InitSchema,
    Kind,
    ParentOwner
  >
}

/** @internal Selects a child OutMessage policy for a Binding with no parent Model contract. */
export interface DescriptorBindingPolicyFields<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy,
> extends DescriptorBindingFields<
  Child,
  ModelSchema,
  MessageSchema,
  OutSchema,
  Config,
  InitSchema,
  ParentOwner,
  Policy
> {
  readonly withOutMessagePolicy: DescriptorBindingPolicySelector<
    Child,
    ModelSchema,
    MessageSchema,
    OutSchema,
    Config,
    InitSchema,
    Kind,
    ParentOwner
  >
}

/** @internal Checks a separately authored OutMessage policy and preserves the selected Binding contract. */
export interface DescriptorBindingPolicySelector<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
> {
  <const Policy>(
    policy: Policy &
      ContextualOutMessagePolicy<
        OutMessagePolicyForBindingConfig<
          CoreContract<Child>,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config
        >,
        Config,
        Child['Message']['Type']
      > &
      ValidateOutMessageHelperPolicy<Child, NoInfer<Policy>>,
  ): DescriptorBinding<
    Child,
    ModelSchema,
    MessageSchema,
    OutSchema,
    Config,
    InitSchema,
    Kind,
    ParentOwner,
    Policy
  >
}

type InitialEvidenceOfBinding<Native> =
  Native extends InitialBindingEvidence<
    infer Field,
    infer Value,
    infer Context,
    infer Requirements,
    infer Registration
  >
    ? InitialBindingEvidence<Field, Value, Context, Requirements, Registration>
    : unknown

type OccurrenceBindingMethods<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  Config,
  ParentOwner,
> =
  Config extends Readonly<{
    field: infer Field extends keyof ModelSchema['Type'] & string
    key: 'key'
    childField: 'model'
  }>
    ? ModelSchema['Type'][Field] extends ReadonlyArray<
        InstanceEvidence<Child['owner']>
      >
      ? Readonly<{
          /**
           * Describes a new ready Instance for this Binding's array field.
           * Insert the request through the parent's `makeFieldsStep`.
           * Checked execution initializes the child before the next Step and
           * retains its init Commands. Calling `create` itself runs no init.
           * The key must be absent from the incoming Model's array.
           */
          create: (
            config: Readonly<{
              key: string
              args: Parameters<CoreContract<Child>['init']>
            }>,
          ) => OccurrenceCreation<
            Child['owner'],
            ParentOwner,
            Field,
            ModelSchema['Type'],
            BindingViewContract<
              CoreContract<Child>,
              ModelSchema,
              MessageSchema,
              Config
            >['parentMessage'],
            Qualify<
              PlacementOfConfig<CoreContract<Child>, Config>,
              Update.RequirementsOf<CoreContract<Child>['init']>
            >,
            BindingViewContract<
              CoreContract<Child>,
              ModelSchema,
              MessageSchema,
              Config
            >['requirements']
          >
        }>
      : unknown
    : unknown

/** @internal Names the complete passive child relationship, including exact operations and construction channels. */
export type DescriptorBindingMember<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy,
> = OccurrenceBindingMethods<
  Child,
  ModelSchema,
  MessageSchema,
  Config,
  ParentOwner
> &
  ([ModelSchema['Type']] extends [never]
    ? CoreContract<Child> extends Readonly<{
        OutMessage: Readonly<{ Type: unknown }>
      }>
      ? DescriptorBindingPolicyFields<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          Kind,
          ParentOwner,
          Policy
        >
      : DescriptorBindingFields<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          ParentOwner,
          Policy
        >
    : CoreContract<Child> extends Readonly<{
          OutMessage: Readonly<{ Type: unknown }>
        }>
      ? DescriptorBindingWithPolicyFields<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          Kind,
          ParentOwner,
          Policy
        >
      : ParentDescriptorBindingFields<
          Child,
          ModelSchema,
          MessageSchema,
          OutSchema,
          Config,
          InitSchema,
          ParentOwner,
          Policy
        >) &
  Pick<
    NativeDescriptorBinding<
      Child,
      ModelSchema,
      MessageSchema,
      OutSchema,
      Config,
      InitSchema,
      Policy
    >,
    Extract<
      keyof CoreContract<Child>['operations'],
      keyof NativeDescriptorBinding<
        Child,
        ModelSchema,
        MessageSchema,
        OutSchema,
        Config,
        InitSchema,
        Policy
      >
    >
  > &
  DescriptorBindingSpec<Child, Config, InitSchema, Kind, ParentOwner, Policy> &
  InitialEvidenceOfBinding<
    NativeDescriptorBinding<
      Child,
      ModelSchema,
      MessageSchema,
      OutSchema,
      Config,
      InitSchema,
      Policy
    >
  > &
  (Kind extends 'Layer' | 'Provided'
    ? YieldableBinding<
        CoreContract<Child>,
        PlacementOfConfig<CoreContract<Child>, Config>,
        Effect.Error<ConstructorEffectOf<Child>>,
        Effect.Services<ConstructorEffectOf<Child>>
      >
    : Readonly<{
        construct: BindingConstructor<
          CoreContract<Child>,
          PlacementOfConfig<CoreContract<Child>, Config>,
          Effect.Error<ConstructorEffectOf<Child>>,
          Effect.Services<ConstructorEffectOf<Child>>
        >
      }>)

type DefaultBindingPolicy<Child> = Child extends AnyDescriptor
  ? CoreContract<Child> extends Readonly<{
      OutMessage: Readonly<{ Type: unknown }>
    }>
    ? UnselectedOutMessagePolicy
    : never
  : never

/** @internal Preserves each child alternative and its distinct OutMessage policy obligation. */
export type DescriptorBinding<
  Child extends AnyDescriptor,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy = DefaultBindingPolicy<Child>,
> = Child extends AnyDescriptor
  ? DescriptorBindingMember<
      BindingChildContract<
        Child['owner'],
        Child['Model'],
        Child['Message'],
        Child['OutMessage'],
        Child[typeof DescriptorTypeId],
        ConstructorEffectOf<Child>
      >,
      ModelSchema,
      MessageSchema,
      OutSchema,
      Config,
      InitSchema,
      Kind,
      ParentOwner,
      CoreContract<Child> extends Readonly<{
        OutMessage: Readonly<{ Type: unknown }>
      }>
        ? Policy
        : never
    >
  : never

declare const DescriptorBindingSpecTypeId: unique symbol

/** @internal Retains one validated child relationship without repeating its parent Schema contracts. */
export interface DescriptorBindingSpec<
  Child extends AnyDescriptor,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy,
> {
  readonly [DescriptorBindingSpecTypeId]: readonly [
    Child,
    Config,
    InitSchema,
    Kind,
    ParentOwner,
    Policy,
  ]
}

declare const FoldOnlyPolicySpecTypeId: unique symbol

/** @internal Stores an exact helper-only fold policy without repeating its parent Model. */
export interface FoldOnlyPolicySpec<
  ChildMessage,
  ChildOutMessage,
  Context,
  Data,
> {
  readonly [FoldOnlyPolicySpecTypeId]: readonly [
    ChildMessage,
    ChildOutMessage,
    Context,
    Data,
  ]
}

type ExactPolicy<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type PolicySpecOf<Policy, Model> =
  Policy extends Readonly<{ fold: infer Fold }>
    ? ExactPolicy<Policy, Readonly<{ fold: Fold }>> extends true
      ? Fold extends NormalizedFoldEvidence<
          infer ChildOutMessage,
          infer Context,
          infer Data
        >
        ? Fold extends OutMessageHelperEvidence<
            ChildOutMessage,
            'fold',
            infer ChildMessage
          >
          ? ExactPolicy<
              Fold,
              NormalizedOutMessageFold<
                Model,
                ChildOutMessage,
                RestoredFoldContext<Model, Context>,
                Data,
                ChildMessage
              >
            > extends true
            ? FoldOnlyPolicySpec<ChildMessage, ChildOutMessage, Context, Data>
            : Policy
          : Policy
        : Policy
      : Policy
    : Policy

type PolicyFromSpec<Policy, Model> =
  Policy extends FoldOnlyPolicySpec<
    infer ChildMessage,
    infer ChildOutMessage,
    infer Context,
    infer Data
  >
    ? Readonly<{
        fold: NormalizedOutMessageFold<
          Model,
          ChildOutMessage,
          RestoredFoldContext<Model, Context>,
          Data,
          ChildMessage
        >
      }>
    : Policy

type BindingSpecOf<Value> =
  Value extends DescriptorBindingSpec<
    infer Child,
    infer Config,
    infer InitSchema,
    infer Kind,
    infer ParentOwner,
    infer Policy
  >
    ? DescriptorBindingSpec<
        Child,
        Config,
        InitSchema,
        Kind,
        ParentOwner,
        PolicySpecOf<Policy, ParentModelOfBinding<Value>>
      >
    : Value

/** @internal Preserves each relationship independently while retaining tuple mutability and union correlations. */
export type BindingSpecs<Bindings extends ReadonlyArray<unknown>> = {
  [Index in keyof Bindings]: BindingSpecOf<Bindings[Index]>
}

type BindingFromSpec<
  Value,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
> =
  Value extends DescriptorBindingSpec<
    infer Child,
    infer Config,
    infer InitSchema,
    infer Kind,
    infer ParentOwner,
    infer Policy
  >
    ? DescriptorBindingMember<
        Child,
        ModelSchema,
        MessageSchema,
        OutSchema,
        Config,
        InitSchema,
        Kind,
        ParentOwner,
        PolicyFromSpec<Policy, ModelSchema['Type']>
      >
    : Extract<Value, AnyBinding>

/** @internal Restores complete Binding contracts against the same validated parent Schema contracts. */
export type BindingsFromSpecs<
  Specs extends ReadonlyArray<unknown>,
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutSchema extends AnySchema | undefined,
> = {
  [Index in keyof Specs]: BindingFromSpec<
    Specs[Index],
    ModelSchema,
    MessageSchema,
    OutSchema
  >
}
