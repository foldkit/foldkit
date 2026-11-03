import type { Effect, Schema } from 'effect'

import type {
  BindChildResultForConfig,
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
import type {
  NormalizedFoldEvidence,
  NormalizedOutMessageFold,
  RestoredFoldContext,
} from '../../block/outMessageFoldContract.js'
import type { BindingPolicyEvidence } from '../../block/policyEvidence.js'
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
} from './contract.js'

type AnySchema = Schema.Codec<any, any, any, any>

type ChildInitContext<SchemaValue> = SchemaValue extends AnySchema
  ? SchemaValue['Type']
  : never

type NativeDescriptorBinding<
  Child extends AnyDescriptor,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
      Policy
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
        >
      > &
      ValidateOutMessageHelperPolicy<CoreContract<Child>, NoInfer<Policy>>,
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

/** @internal Names the complete passive child relationship, including exact operations and construction channels. */
export type DescriptorBindingMember<
  Child extends AnyDescriptor,
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy,
> = ([ModelSchema['Type']] extends [never]
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutSchema extends AnySchema | undefined,
  Config,
  InitSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
  Policy = DefaultBindingPolicy<Child>,
> = Child extends AnyDescriptor
  ? DescriptorBindingMember<
      Child,
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
export interface FoldOnlyPolicySpec<ChildOutMessage, Context, Data> {
  readonly [FoldOnlyPolicySpecTypeId]: readonly [ChildOutMessage, Context, Data]
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
        ? ExactPolicy<
            Fold,
            NormalizedOutMessageFold<
              Model,
              ChildOutMessage,
              RestoredFoldContext<Model, Context>,
              Data
            >
          > extends true
          ? FoldOnlyPolicySpec<ChildOutMessage, Context, Data>
          : Policy
        : Policy
      : Policy
    : Policy

type PolicyFromSpec<Policy, Model> =
  Policy extends FoldOnlyPolicySpec<
    infer ChildOutMessage,
    infer Context,
    infer Data
  >
    ? Readonly<{
        fold: NormalizedOutMessageFold<
          Model,
          ChildOutMessage,
          RestoredFoldContext<Model, Context>,
          Data
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
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
    ? DescriptorBinding<
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
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutSchema extends AnySchema | undefined,
> = {
  [Index in keyof Specs]: BindingFromSpec<
    Specs[Index],
    ModelSchema,
    MessageSchema,
    OutSchema
  >
}
