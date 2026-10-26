import { Array, Option, Predicate, Schema, SchemaAST } from 'effect'

import type * as Update from '../update/index.js'
import { assertCompletedBlock } from './assemblyState.js'
import {
  type BindableBlock,
  type Binding,
  type BindingStorageEvidence,
  bind,
} from './binding.js'
import {
  attachOutMessagePolicy,
  deferredOutMessagePolicy,
} from './bindingOutMessagePolicy.js'
import {
  type ChildEnvelope,
  type KeyedChildEnvelope,
  childMessageTag,
  makeChildEnvelopeSchema,
  registerGeneratedDelivery,
} from './childEnvelope.js'
import {
  registerBindingInitialPolicy,
  registerBindingParentContract,
  registerBindingStorage,
} from './composition.js'
import { hasSameDecodedSchemaShape } from './decodedSchemaShape.js'
import {
  type RuntimeFromParentMessage,
  hasObservableUpdateContext,
} from './delivery.js'
import {
  type DirectField,
  normalizeConnectionConfig,
} from './directConnection.js'
import type { InitialBindingEvidence } from './initialization.js'
import type { InstanceKey } from './instanceContext.js'
import { type KeyedBinding, bindEach } from './keyedBinding.js'
import {
  type KeyAt,
  type KeyedFieldConfig,
  type WrappedItemAt,
  type WrappedKeyedFieldConfig,
  isInstanceKeySchema,
  isKeyedFieldStorage,
  keyedOptionStorageOf,
  normalizeKeyedFieldConfig,
  wrappedKeyedInitialPolicyOf,
} from './keyedFieldConnection.js'
import {
  isKeyedMapBindingConfig,
  isKeyedMapFieldStorage,
  keyedMapBindingStorageOf,
  normalizeKeyedMapFieldConfig,
} from './keyedMapFieldConnection.js'
import type { OutMessageHelperEvidence } from './outMessageHelperEvidence.js'
import type { ValidateConcreteComposition } from './requirements.js'
import type { Qualify } from './scope.js'

type AnySchema = Schema.Codec<any, any, any, any>

type BlockId<BlockValue> =
  BlockValue extends Readonly<{
    owner: Readonly<{ id: infer Id extends string }>
  }>
    ? Id
    : never

type ReturnOf<Value> = Value extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Value extends Schema.Top
    ? Equal<Output, Value['Type']> extends true
      ? Value['Type']
      : Output
    : Output
  : never

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type ChildUpdateContext<BlockValue extends BindableBlock> =
  Parameters<BlockValue['update']> extends readonly [
    unknown,
    unknown,
    ...infer Context,
  ]
    ? Context
    : readonly []

type ParentOutMessage<ParentOutMessageSchema> =
  ParentOutMessageSchema extends AnySchema
    ? ParentOutMessageSchema['Type']
    : never

type PolicyStepReturn<ParentModel, ParentMessage, ParentOutMessageValue> =
  Readonly<{
    model: ParentModel
    commands?: Update.Commands<ParentMessage, any> | undefined
    outMessage?: ParentOutMessageValue
  }>

type ParentOwnedOutMessageFold<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  ParentOutMessageValue,
> = (
  outMessage: ChildOutMessage,
  context: Update.FoldContext<ChildMessage, ParentMessage, ParentModel>,
) => (
  model: ParentModel,
) => PolicyStepReturn<ParentModel, ParentMessage, ParentOutMessageValue>

type ParentOwnedOutMessagePolicy<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  ParentOutMessageValue,
> =
  | Readonly<{
      /** Handles a child fact locally. The returned Step receives the parent
       * Model after the next child Model has been written. */
      fold: ParentOwnedOutMessageFold<
        ParentModel,
        ChildMessage,
        ParentMessage,
        ChildOutMessage,
        ParentOutMessageValue
      >
      forward?: never
    }>
  | ([ParentOutMessageValue] extends [never]
      ? never
      : Readonly<{
          /** Maps a child fact to the declared parent OutMessage, or returns
           * undefined for a named variant that stops at this boundary. */
          forward: (
            outMessage: ChildOutMessage,
          ) => ParentOutMessageValue | undefined
          /** Also handles the fact locally. An OutMessage returned by this
           * Step takes precedence over the forwarded OutMessage. */
          fold?: ParentOwnedOutMessageFold<
            ParentModel,
            ChildMessage,
            ParentMessage,
            ChildOutMessage,
            ParentOutMessageValue
          >
        }>)

type ParentOwnedKeyedOutMessagePolicy<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  ParentOutMessageValue,
  Key,
> =
  | Readonly<{
      /** Handles a child fact locally. The returned Step receives the parent
       * Model after the next child Model has been written. */
      fold: (
        key: Key,
        outMessage: ChildOutMessage,
        context: Update.FoldContext<ChildMessage, ParentMessage, ParentModel>,
      ) => (
        model: ParentModel,
      ) => PolicyStepReturn<ParentModel, ParentMessage, ParentOutMessageValue>
      forward?: never
    }>
  | ([ParentOutMessageValue] extends [never]
      ? never
      : Readonly<{
          /** Maps a child fact to the declared parent OutMessage, or returns
           * undefined for a named variant that stops at this boundary. */
          forward: (
            key: Key,
            outMessage: ChildOutMessage,
          ) => ParentOutMessageValue | undefined
          /** Also handles the fact locally. An OutMessage returned by this
           * Step takes precedence over the forwarded OutMessage. */
          fold?: (
            key: Key,
            outMessage: ChildOutMessage,
            context: Update.FoldContext<
              ChildMessage,
              ParentMessage,
              ParentModel
            >,
          ) => (
            model: ParentModel,
          ) => PolicyStepReturn<
            ParentModel,
            ParentMessage,
            ParentOutMessageValue
          >
        }>)

type PolicyOf<BlockValue, Policy> =
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? Policy
    : never

type GeneratedEnvelopeSchema<
  BlockValue extends BindableBlock,
  Placement extends string,
> = BlockValue['Message'] extends infer Message extends Schema.Top
  ? Schema.Codec<
      ChildEnvelope<Placement, Message['Type']>,
      ChildEnvelope<Placement, Message['Encoded']>,
      Message['DecodingServices'],
      Message['EncodingServices']
    >
  : never

type GeneratedKeyedEnvelopeSchema<
  BlockValue extends BindableBlock,
  Placement extends string,
  KeySchema extends Schema.Top,
> = BlockValue['Message'] extends infer Message extends Schema.Top
  ? Schema.Codec<
      KeyedChildEnvelope<Placement, KeySchema['Type'], Message['Type']>,
      KeyedChildEnvelope<Placement, KeySchema['Encoded'], Message['Encoded']>,
      Message['DecodingServices'] | KeySchema['DecodingServices'],
      Message['EncodingServices'] | KeySchema['EncodingServices']
    >
  : never

type GeneratedDirectBindingReturn<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Placement extends string,
  Policy,
> = Binding<
  BlockValue,
  ParentModelSchema['Type'],
  ChildEnvelope<Placement, BlockValue['Message']['Type']>,
  Placement,
  PolicyOf<BlockValue, Policy>,
  ParentModelSchema['Type'],
  ParentMessageSchema['Type'],
  ParentOutMessage<ParentOutMessageSchema>,
  ChildEnvelope<Placement, BlockValue['Message']['Type']>,
  ChildEnvelope<Placement, BlockValue['Message']['Type']>,
  ParentMessageSchema,
  GeneratedEnvelopeSchema<BlockValue, Placement>
>

type GeneratedKeyedBindingReturn<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  KeySchema extends Schema.Top,
  Placement extends string,
  Policy,
> = KeyedBinding<
  BlockValue,
  ParentModelSchema['Type'],
  KeyedChildEnvelope<
    Placement,
    KeySchema['Type'],
    BlockValue['Message']['Type']
  >,
  Extract<KeySchema['Type'], InstanceKey>,
  Placement,
  PolicyOf<BlockValue, Policy>,
  ParentModelSchema['Type'],
  ParentMessageSchema['Type'],
  ParentOutMessage<ParentOutMessageSchema>,
  KeyedChildEnvelope<
    Placement,
    KeySchema['Type'],
    BlockValue['Message']['Type']
  >,
  KeyedChildEnvelope<
    Placement,
    KeySchema['Type'],
    BlockValue['Message']['Type']
  >,
  ParentMessageSchema,
  GeneratedKeyedEnvelopeSchema<BlockValue, Placement, KeySchema>
>

type MessageFreeBindingReturn<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Placement extends string,
  Policy,
> = Binding<
  BlockValue,
  ParentModelSchema['Type'],
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? ParentMessageSchema['Type']
    : never,
  Placement,
  PolicyOf<BlockValue, Policy>,
  ParentModelSchema['Type'],
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? ParentMessageSchema['Type']
    : never,
  ParentOutMessage<ParentOutMessageSchema>,
  never,
  never,
  ParentMessageSchema
>

type ExactRequiredChildField<ParentModel, ChildModel> = Extract<
  {
    [Field in keyof ParentModel]-?: {} extends Pick<ParentModel, Field>
      ? never
      : IsAny<ParentModel[Field]> extends true
        ? never
        : Equal<ParentModel[Field], ChildModel> extends true
          ? Field
          : never
  }[keyof ParentModel],
  string
>

type AccessorInitialProjection<ParentModel, ChildModel> = {
  [Field in ExactRequiredChildField<ParentModel, ChildModel>]: Readonly<{
    [Key in Field]: ChildModel
  }> &
    Readonly<{
      [Key in Exclude<keyof ParentModel, Field>]?: never
    }>
}[ExactRequiredChildField<ParentModel, ChildModel>]

type ProjectionField<ProjectedModel> = Extract<keyof ProjectedModel, string>

type ValidateAccessorInitialProjection<ProjectedModel, ParentModel> =
  true extends IsUnion<ProjectedModel>
    ? Readonly<{
        'Binding init toParentFields must always project the same parent Model field': ProjectedModel
      }>
    : [Exclude<keyof ProjectedModel, keyof ParentModel>] extends [never]
      ? unknown
      : Readonly<{
          'Binding init toParentFields must project exactly one declared parent Model field': Exclude<
            keyof ProjectedModel,
            keyof ParentModel
          >
        }>

type ValidateInitialContext<Context> = [Context] extends [never]
  ? Readonly<{
      'Binding init context cannot use never': Context
    }>
  : IsAny<Context> extends true
    ? Readonly<{
        'Binding init context cannot use any': Context
      }>
    : IsUnknown<Context> extends true
      ? Readonly<{
          'Binding init context cannot use unknown': Context
        }>
      : unknown

type InitialResolverContext<
  Resolver extends (...args: ReadonlyArray<any>) => any,
  ChildInitContext,
> =
  Parameters<Resolver> extends readonly []
    ? never
    : Parameters<Resolver> extends readonly [infer Context]
      ? [ChildInitContext] extends [never]
        ? Context
        : ChildInitContext
      : never

type ValidateInitialResolver<
  Resolver extends (...args: ReadonlyArray<any>) => any,
> =
  IsAny<Resolver> extends true
    ? Readonly<{ 'Binding init contextToArgs cannot use any': Resolver }>
    : IsAny<ReturnType<Resolver>> extends true
      ? Readonly<{
          'Binding init contextToArgs return cannot use any': ReturnType<Resolver>
        }>
      : Equal<
            Resolver,
            (...args: Parameters<Resolver>) => ReturnType<Resolver>
          > extends false
        ? Readonly<{
            'Binding init contextToArgs requires one concrete call signature': Resolver
          }>
        : Parameters<Resolver> extends readonly []
          ? unknown
          : Parameters<Resolver> extends readonly [infer Context]
            ? ValidateInitialContext<Context>
            : Readonly<{
                'Binding init contextToArgs accepts zero or one context argument': Parameters<Resolver>
              }>

type ValidateInitialResolverStorage<
  ParentModel,
  Field extends keyof ParentModel,
  ChildModel,
  Resolver extends (...args: ReadonlyArray<any>) => any,
> =
  ParentModel[Field] extends Option.Option<ChildModel>
    ? ReturnType<Resolver> extends Option.Option<ReadonlyArray<unknown>>
      ? unknown
      : Readonly<{
          'Optional Binding init contextToArgs must return Option<InitArgs>': ReturnType<Resolver>
        }>
    : ReturnType<Resolver> extends ReadonlyArray<unknown>
      ? unknown
      : Readonly<{
          'Required Binding init contextToArgs must return InitArgs': ReturnType<Resolver>
        }>

type InitializedBinding<
  BindingValue,
  BlockValue extends BindableBlock,
  ParentModel,
  Field extends keyof ParentModel & string,
  Placement extends string,
  Context,
> = BindingValue &
  InitialBindingEvidence<
    Field,
    ParentModel[Field],
    Context,
    Qualify<Placement, Update.RequirementsOf<BlockValue['init']>>,
    import('./binding.js').RequirementOfBinding<BindingValue>
  >

type DirectInitialValue<Initial> =
  Initial extends Readonly<{
    init: infer Value
  }>
    ? Value
    : never

type ValidateDirectInitialField<Field extends string> = string extends Field
  ? Readonly<{
      'Direct Binding init field must be one literal field': Field
    }>
  : true extends IsUnion<Field>
    ? Readonly<{
        'Direct Binding init field must be one literal field': Field
      }>
    : unknown

type ValidateDirectInitialValue<Initial> =
  true extends IsUnion<DirectInitialValue<Initial>>
    ? Readonly<{
        'Direct Binding init must be one concrete policy': DirectInitialValue<Initial>
      }>
    : unknown

type ValidateDirectInitialPolicy<
  Initial,
  ParentModel,
  Field extends keyof ParentModel,
  ChildModel,
> = ValidateDirectInitialField<Extract<NoInfer<Field>, string>> &
  ValidateDirectInitialValue<Initial> &
  (Initial extends Readonly<{
    init: Readonly<{
      contextToArgs: infer Resolver extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? ValidateInitialResolver<Resolver> &
        ValidateInitialResolverStorage<ParentModel, Field, ChildModel, Resolver>
    : unknown)

type DirectBindingInitializationResult<
  BindingValue,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Field extends keyof ParentModelSchema['Type'] & string,
  Placement extends string,
  Initial,
  ChildInitContext,
> = (
  Initial extends Readonly<{ init: false }>
    ? false
    : Initial extends Readonly<{
          init:
            | true
            | Readonly<{
                contextToArgs: (...args: ReadonlyArray<any>) => any
              }>
        }>
      ? true
      : [Initial] extends [undefined]
        ? Equal<ParentModelSchema['Type'][Field], BlockValue['Model']['Type']>
        : false
) extends true
  ? InitializedBinding<
      BindingValue,
      BlockValue,
      ParentModelSchema['Type'],
      Field,
      Placement,
      Initial extends Readonly<{
        init: Readonly<{
          contextToArgs: infer Resolver extends (
            ...args: ReadonlyArray<any>
          ) => any
        }>
      }>
        ? InitialResolverContext<Resolver, ChildInitContext>
        : never
    >
  : BindingValue

type MessageFreeDirectBindingResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Field extends keyof ParentModelSchema['Type'] & string,
  Placement extends string,
  Policy,
  Initial,
  ChildInitContext,
> = DirectBindingInitializationResult<
  MessageFreeBindingReturn<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Placement,
    Policy
  >,
  BlockValue,
  ParentModelSchema,
  Field,
  Placement,
  Initial,
  ChildInitContext
>

type GeneratedDirectBindingResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Field extends keyof ParentModelSchema['Type'] & string,
  Placement extends string,
  Policy,
  Initial,
  ChildInitContext,
> = DirectBindingInitializationResult<
  GeneratedDirectBindingReturn<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Placement,
    Policy
  >,
  BlockValue,
  ParentModelSchema,
  Field,
  Placement,
  Initial,
  ChildInitContext
>

type MessageFreeAccessorBindingResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  ProjectedModel,
  Placement extends string,
  Policy,
  Resolver extends (...args: ReadonlyArray<any>) => any,
  ChildInitContext,
> = InitializedBinding<
  MessageFreeBindingReturn<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Placement,
    Policy
  >,
  BlockValue,
  ParentModelSchema['Type'],
  Extract<
    ProjectionField<ProjectedModel>,
    keyof ParentModelSchema['Type'] & string
  >,
  Placement,
  InitialResolverContext<Resolver, ChildInitContext>
>

type GeneratedAccessorBindingResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  ProjectedModel,
  Placement extends string,
  Policy,
  Resolver extends (...args: ReadonlyArray<any>) => any,
  ChildInitContext,
> = InitializedBinding<
  GeneratedDirectBindingReturn<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Placement,
    Policy
  >,
  BlockValue,
  ParentModelSchema['Type'],
  Extract<
    ProjectionField<ProjectedModel>,
    keyof ParentModelSchema['Type'] & string
  >,
  Placement,
  InitialResolverContext<Resolver, ChildInitContext>
>

/** @internal One keyed child occurrence assembled during initialization. */
export type InitialWrappedOccurrence<
  BlockValue extends BindableBlock,
  ParentModel,
  Field extends keyof ParentModel,
  KeyField extends string,
  Arguments extends ReadonlyArray<unknown> = Parameters<
    NoInfer<BlockValue>['init']
  >,
> = Readonly<{
  key: KeyAt<WrappedItemAt<ParentModel, Field>, KeyField>
  args: readonly [...Arguments]
}>

type ValidateWrappedToItem<
  ToItem extends (...args: ReadonlyArray<any>) => any,
> =
  IsAny<ToItem> extends true
    ? Readonly<{ 'Binding init toItem cannot use any': ToItem }>
    : IsAny<ReturnType<ToItem>> extends true
      ? Readonly<{
          'Binding init toItem return cannot use any': ReturnType<ToItem>
        }>
      : Equal<
            ToItem,
            (...args: Parameters<ToItem>) => ReturnType<ToItem>
          > extends false
        ? Readonly<{
            'Binding init toItem requires one concrete call signature': ToItem
          }>
        : unknown

type InitializedKeyedBinding<
  BindingValue,
  BlockValue extends BindableBlock,
  ParentModel,
  Field extends keyof ParentModel & string,
  Placement extends string,
  Occurrences extends (...args: ReadonlyArray<any>) => any,
  ChildInitContext,
> = InitializedBinding<
  BindingValue,
  BlockValue,
  ParentModel,
  Field,
  Placement,
  InitialResolverContext<Occurrences, ChildInitContext>
>

type ContextualStaticOutMessageConfig<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  ParentOutMessageValue,
> =
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
  }>
    ? Readonly<{
        outMessage: ParentOwnedOutMessagePolicy<
          ParentModel,
          BlockValue['Message']['Type'],
          ParentMessage,
          ChildOutMessage,
          ParentOutMessageValue
        >
      }>
    : Readonly<{ outMessage?: never }>

type PolicyOfConfig<Config> =
  Config extends Readonly<{
    outMessage: infer Policy
  }>
    ? Policy
    : never

type InvalidBindChildConfig<Reason> = readonly [
  error: Readonly<{
    'Binding config is invalid': Reason
  }>,
]

type ValidateInitialKeys<Config> = 'init' extends keyof Config
  ? Config extends Readonly<{ init: infer Initial }>
    ? Initial extends boolean
      ? readonly []
      : Exclude<
            keyof Initial,
            'contextToArgs' | 'toParentFields' | 'instances' | 'toItem'
          > extends never
        ? readonly []
        : InvalidBindChildConfig<
            Readonly<{
              'init contains unsupported fields': Exclude<
                keyof Initial,
                'contextToArgs' | 'toParentFields' | 'instances' | 'toItem'
              >
            }>
          >
    : InvalidBindChildConfig<'Binding init must be one required, concrete policy'>
  : readonly []

type ValidateProjectedInitialModel<ParentModel, Config> =
  Config extends Readonly<{
    init: Readonly<{
      toParentFields: (...args: ReadonlyArray<any>) => infer ProjectedModel
    }>
  }>
    ? Exclude<keyof ProjectedModel, keyof ParentModel> extends never
      ? readonly []
      : InvalidBindChildConfig<
          Readonly<{
            'Binding init toParentFields contains undeclared parent Model fields': Exclude<
              keyof ProjectedModel,
              keyof ParentModel
            >
          }>
        >
    : readonly []

type SupportedBindChildConfigKey = BindChildConfigKey | 'init'

type ValidateBindChildConfigKeys<Config> =
  Exclude<keyof Config, SupportedBindChildConfigKey> extends never
    ? readonly []
    : InvalidBindChildConfig<
        Readonly<{
          'Binding config contains unsupported fields': Exclude<
            keyof Config,
            SupportedBindChildConfigKey
          >
        }>
      >

type ValidateKeyedFieldSource<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Config,
> =
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>
    ? Config extends Readonly<{
        field: infer Field extends keyof ParentModelSchema['Type'] & string
        key: infer KeyField extends string
      }>
      ? Config extends Readonly<{ childField: infer ChildField extends string }>
        ? Config extends Pick<
            WrappedKeyedFieldConfig<
              BlockValue,
              ParentModelSchema,
              never,
              never,
              Field,
              KeyField,
              ChildField,
              PlacementOfConfig<BlockValue, Config>
            >,
            'field' | 'key' | 'childField'
          >
          ? readonly []
          : InvalidBindChildConfig<'Invalid wrapped keyed field storage'>
        : KeyField extends keyof BlockValue['Model']['Type'] & string
          ? Config extends Pick<
              KeyedFieldConfig<
                BlockValue,
                ParentModelSchema,
                never,
                never,
                Field,
                KeyField,
                PlacementOfConfig<BlockValue, Config>
              >,
              'field' | 'key'
            >
            ? readonly []
            : InvalidBindChildConfig<'Invalid keyed field storage'>
          : InvalidBindChildConfig<'Invalid keyed field key'>
      : InvalidBindChildConfig<'Keyed field storage requires field and key'>
    : InvalidBindChildConfig<'Keyed field storage requires a parent Struct Model'>

type ValidateStaticStorage<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Keys,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
> = 'childField' extends Keys
  ? Extract<
      Keys,
      'readAll' | 'read' | 'write' | 'writeAt' | 'presentWhen'
    > extends never
    ? ValidateKeyedFieldSource<
        BlockValue,
        ParentModelSchema,
        Readonly<{
          field: Field
          key: KeyField
          childField: ChildField
        }>
      >
    : InvalidBindChildConfig<'Wrapped keyed storage cannot include accessor or general keyed adapters'>
  : 'key' extends Keys
    ? Extract<
        Keys,
        'readAll' | 'read' | 'write' | 'writeAt' | 'presentWhen'
      > extends never
      ? ValidateKeyedFieldSource<
          BlockValue,
          ParentModelSchema,
          Readonly<{
            field: Field
            key: KeyField
          }>
        >
      : InvalidBindChildConfig<'Keyed field storage cannot include accessor or general keyed adapters'>
    : 'field' extends Keys
      ? ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>
        ? IsAny<Field> extends true
          ? InvalidBindChildConfig<'Direct child Model field cannot use any'>
          : [Field] extends [never]
            ? InvalidBindChildConfig<'A direct child Model field is required'>
            : true extends IsUnion<Field>
              ? InvalidBindChildConfig<'A direct Binding requires one literal Model field'>
              : [Field] extends [
                    DirectField<
                      ParentModelSchema['Type'],
                      BlockValue['Model']['Type']
                    >,
                  ]
                ? Extract<
                    Keys,
                    'read' | 'write' | 'readAll' | 'writeAt'
                  > extends never
                  ? readonly []
                  : InvalidBindChildConfig<'Direct field storage cannot include accessor or keyed adapters'>
                : InvalidBindChildConfig<
                    Readonly<{ 'Invalid direct child Model field': Field }>
                  >
        : InvalidBindChildConfig<'Direct field storage requires a Struct Model'>
      : 'read' extends Keys
        ? 'write' extends Keys
          ? 'presentWhen' extends Keys
            ? InvalidBindChildConfig<'Accessor storage cannot include presentWhen'>
            : readonly []
          : InvalidBindChildConfig<'Accessor storage requires both read and write functions'>
        : InvalidBindChildConfig<'A Binding requires direct, accessor, or keyed storage'>

type UsesGeneratedDelivery<BlockValue extends BindableBlock> = [
  BlockValue['Message']['Type'],
] extends [never]
  ? false
  : true

type ValidateStaticMessageMapping<BlockValue extends BindableBlock, Keys> = [
  BlockValue['Message']['Type'],
] extends [never]
  ? Extract<Keys, 'delivery' | 'keySchema'> extends never
    ? readonly []
    : InvalidBindChildConfig<'A Message-free child cannot configure Message delivery'>
  : Extract<
        Keys,
        'parentMessage' | 'toParentMessage' | 'fromParentMessage'
      > extends never
    ? readonly []
    : InvalidBindChildConfig<'Parent Message wrappers are generated from the Binding placement'>

type ValidationResult<Validation> = unknown extends Validation
  ? readonly []
  : InvalidBindChildConfig<Validation>

type ValidateStaticInitialPolicy<
  BlockValue extends BindableBlock,
  ParentModel,
  Config,
> =
  Config extends Readonly<{
    init: Readonly<{
      instances: infer Instances extends (...args: ReadonlyArray<any>) => any
      toItem: infer ToItem extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? Config extends Readonly<{
        field: infer Field extends keyof ParentModel
      }>
      ? ParentModel[Field] extends Option.Option<unknown>
        ? InvalidBindChildConfig<'Option-wrapped keyed child initialization remains parent-owned; use Binding.init with toParentModel'>
        : ValidationResult<
            ValidateInitialResolver<Instances> & ValidateWrappedToItem<ToItem>
          >
      : ValidationResult<
          ValidateInitialResolver<Instances> & ValidateWrappedToItem<ToItem>
        >
    : Config extends Readonly<{ key: unknown; init: unknown }>
      ? InvalidBindChildConfig<'Keyed child initialization requires an instances policy'>
      : Config extends Readonly<{
            field: infer Field extends keyof ParentModel & string
            init: unknown
          }>
        ? Config['init'] extends true
          ? Equal<ParentModel[Field], BlockValue['Model']['Type']> extends true
            ? [] extends Parameters<BlockValue['init']>
              ? readonly []
              : InvalidBindChildConfig<'A child requiring init arguments needs init.contextToArgs or init: false'>
            : InvalidBindChildConfig<'Optional child initialization requires an explicit presence policy'>
          : ValidationResult<
              ValidateDirectInitialPolicy<
                Readonly<{ init: Config['init'] }>,
                ParentModel,
                Field,
                BlockValue['Model']['Type']
              >
            >
        : Config extends Readonly<{
              init: Readonly<{
                contextToArgs: infer Resolver extends (
                  ...args: ReadonlyArray<any>
                ) => any
                toParentFields: (
                  ...args: ReadonlyArray<any>
                ) => infer ProjectedModel
              }>
            }>
          ? ValidationResult<
              ValidateInitialResolver<Resolver> &
                ValidateAccessorInitialProjection<ProjectedModel, ParentModel>
            >
          : Config extends Readonly<{ init: unknown }>
            ? InvalidBindChildConfig<'Binding init policy does not match its storage mode'>
            : Config extends Readonly<{
                  field: infer Field extends keyof ParentModel & string
                }>
              ? Equal<
                  ParentModel[Field],
                  BlockValue['Model']['Type']
                > extends true
                ? [] extends Parameters<BlockValue['init']>
                  ? readonly []
                  : InvalidBindChildConfig<'A child requiring init arguments needs init.contextToArgs or init: false'>
                : readonly []
              : readonly []

type ValidateConcreteCompositionArguments<BlockValue extends BindableBlock> =
  unknown extends ValidateConcreteComposition<BlockValue>
    ? readonly []
    : readonly [error: ValidateConcreteComposition<BlockValue>]

type ValidateStaticBindingConfigWithoutPolicy<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Keys,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
  Config,
> =
  IsAny<Config> extends true
    ? InvalidBindChildConfig<'Binding config cannot use any'>
    : IsUnknown<Config> extends true
      ? InvalidBindChildConfig<'Binding config cannot use unknown'>
      : true extends IsUnion<Config>
        ? InvalidBindChildConfig<'Binding config must be one concrete object type'>
        : ValidateBindChildConfigKeys<Config> extends readonly []
          ? ValidateInitialKeys<Config> extends readonly []
            ? ValidateProjectedInitialModel<
                ParentModelSchema['Type'],
                Config
              > extends readonly []
              ? ValidateStaticStorage<
                  BlockValue,
                  ParentModelSchema,
                  Keys,
                  Field,
                  KeyField,
                  ChildField
                > extends readonly []
                ? ValidateStaticMessageMapping<
                    BlockValue,
                    Keys
                  > extends readonly []
                  ? ValidateStaticInitialPolicy<
                      BlockValue,
                      ParentModelSchema['Type'],
                      Config
                    >
                  : ValidateStaticMessageMapping<BlockValue, Keys>
                : ValidateStaticStorage<
                    BlockValue,
                    ParentModelSchema,
                    Keys,
                    Field,
                    KeyField,
                    ChildField
                  >
              : ValidateProjectedInitialModel<ParentModelSchema['Type'], Config>
            : ValidateInitialKeys<Config>
          : ValidateBindChildConfigKeys<Config>

type ContextualKeyedOutMessageConfig<
  BlockValue extends BindableBlock,
  ParentModel,
  ParentMessage,
  ParentOutMessageValue,
  Key extends InstanceKey,
> =
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: infer ChildOutMessage }>
  }>
    ? Readonly<{
        outMessage: ParentOwnedKeyedOutMessagePolicy<
          ParentModel,
          BlockValue['Message']['Type'],
          ParentMessage,
          ChildOutMessage,
          ParentOutMessageValue,
          Key
        >
      }>
    : Readonly<{ outMessage?: never }>

type ItemOfReadAll<ReadAll> =
  ReturnOf<ReadAll> extends ReadonlyArray<infer Item> ? Item : never

type StaticOutMessageContext<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
> =
  ContextualStaticOutMessageConfig<
    BlockValue,
    ParentModelSchema['Type'],
    ParentMessageSchema['Type'],
    ParentOutMessage<ParentOutMessageSchema>
  > extends Readonly<{ outMessage: infer OutMessage }>
    ? OutMessage
    : never

type ContextualPolicyFunction<Callback> = Callback extends (
  ...args: ReadonlyArray<any>
) => any
  ? (...args: Parameters<Callback>) => any
  : Callback

type ContextualPolicyFold<Fold> = Fold extends (
  ...args: ReadonlyArray<any>
) => any
  ? ContextualPolicyFunction<Fold>
  : Fold

type ContextualOutMessagePolicy<Policy> = Policy extends unknown
  ? {
      [Key in keyof Policy]: Key extends 'fold'
        ? ContextualPolicyFold<Policy[Key]>
        : ContextualPolicyFunction<Policy[Key]>
    }
  : never

type ValidateGeneralKeyedSourceWithoutPolicy<Config> =
  ValidateBindChildConfigKeys<Config>

type GeneralKeyedConfigKey =
  | 'placement'
  | 'readAll'
  | 'key'
  | 'read'
  | 'writeAt'
  | 'outMessage'
  | 'subscriptions'
  | 'delivery'
  | 'keySchema'

type GeneralKeyedContextualProperties<
  Keys extends GeneralKeyedConfigKey,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  ReadAll,
  KeyOf extends (item: ItemOfReadAll<NoInfer<ReadAll>>) => InstanceKey,
  KeyValue extends InstanceKey,
> = {
  [
    Key in keyof Pick<BindChildConfigDocumentation, Keys>
  ]?: Key extends 'readAll'
    ? ReadAll
    : Key extends 'key'
      ? KeyOf
      : Key extends 'read'
        ? (item: ItemOfReadAll<NoInfer<ReadAll>>) => BlockValue['Model']['Type']
        : Key extends 'writeAt'
          ? (
              model: ParentModelSchema['Type'],
              key: KeyValue,
              nextChildModel: BlockValue['Model']['Type'],
            ) => ParentModelSchema['Type']
          : Key extends 'outMessage'
            ? ContextualOutMessagePolicy<
                KeyedOutMessageContext<
                  'readAll',
                  BlockValue,
                  ParentModelSchema,
                  ParentMessageSchema,
                  ParentOutMessageSchema,
                  KeyValue,
                  never,
                  never
                >
              >
            : Key extends 'subscriptions'
              ? KeyedSubscriptionsContext<
                  BlockValue,
                  ParentModelSchema['Type'],
                  KeyValue
                >
              : Key extends 'delivery'
                ? GeneratedDeliveryContext<
                    BlockValue,
                    ParentModelSchema['Type'],
                    KeyValue
                  >
                : Key extends 'keySchema'
                  ? Schema.Top &
                      Schema.Schema<Extract<ReturnType<KeyOf>, InstanceKey>>
                  : unknown
}

interface BindChildConfigDocumentation {
  /** The exact parent Struct field storing the child, its Option, or its keyed array. */
  field: unknown
  /** The wrapper field containing the child Model in a keyed parent-owned item. */
  childField: unknown
  /** Reads the current keyed occurrences. Removal stops that occurrence's lifecycle work. */
  readAll: unknown
  /** The stable key field for array shorthand, or key reader for custom keyed storage. */
  key: unknown
  /** Reads the child Model. Returning None makes the child absent and folds leave it unchanged. */
  read: unknown
  /** Writes the next child Model after its update or exposed operation. */
  write: unknown
  /** Replaces the child Model at an existing key without recreating a removed occurrence. */
  writeAt: unknown
  /** Stable Binding identity within this parent, independent of DOM placement. Defaults to the field for unkeyed direct storage and the child Block ID otherwise. */
  placement: unknown
  /** Makes a direct-field child absent while false, including updates and lifecycle effects. Distinct from the Subscription-only gate. */
  presentWhen: unknown
  /** Selects update delivery context and optionally gates generated child Message delivery. */
  delivery: unknown
  /** Declares a general selector's exact decoded string or finite-number key type. Its encoded channel is the wire-key channel. */
  keySchema: unknown
  /** Folds or forwards every child OutMessage. Composition checks returned Steps and their registered sibling requirements. */
  outMessage: unknown
  /** Optional activation gates that affect only child Subscriptions while the child is present. */
  subscriptions: unknown
  /** Configures initial presence and arguments for this child, or opts out with false. A required direct field initializes without arguments by default. Other automatic initialization uses contextToArgs or instances to select from the parent-prepared ChildInitContext. Selectors run when parent init is called; handlers execute later in the Runtime. */
  init: unknown
}

type CoreConfigKey =
  | 'placement'
  | 'presentWhen'
  | 'outMessage'
  | 'subscriptions'
  | 'delivery'
  | 'keySchema'

type BindChildConfigKey = CoreConfigKey | StorageConfigKey | 'init'

type KeyForConfig<
  Keys,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  KeyValue extends InstanceKey,
  Field extends string,
  KeyField extends string,
> = 'readAll' extends Keys
  ? KeyValue
  : 'childField' extends Keys
    ? KeyAt<WrappedItemAt<ParentModelSchema['Type'], Field>, KeyField>
    : KeyAt<BlockValue['Model']['Type'], KeyField>

type KeySchemaForConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Config,
> =
  Config extends Readonly<{
    keySchema: infer KeySchema extends Schema.Top
  }>
    ? KeySchema
    : Config extends Readonly<{
          childField: string
          field: infer Field extends string
          key: infer KeyField extends string
        }>
      ? ParentModelSchema extends Readonly<{
          fields: infer ParentFields extends Schema.Struct.Fields
        }>
        ? Field extends keyof ParentFields
          ? ParentFields[Field] extends Schema.$Array<
              infer ItemSchema extends Schema.Top
            >
            ? ItemSchema extends Readonly<{
                fields: infer ItemFields extends Schema.Struct.Fields
              }>
              ? KeyField extends keyof ItemFields
                ? ItemFields[KeyField]
                : never
              : never
            : ParentFields[Field] extends Schema.Option<
                  infer ItemSchema extends Schema.Top
                >
              ? ItemSchema extends Readonly<{
                  fields: infer ItemFields extends Schema.Struct.Fields
                }>
                ? KeyField extends keyof ItemFields
                  ? ItemFields[KeyField]
                  : never
                : never
              : never
          : never
        : never
      : Config extends Readonly<{ key: infer KeyField extends string }>
        ? BlockValue['Model'] extends Readonly<{
            fields: infer ChildFields extends Schema.Struct.Fields
          }>
          ? KeyField extends keyof ChildFields
            ? ChildFields[KeyField]
            : never
          : never
        : never

type KeyedOutMessageContext<
  Keys,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  KeyValue extends InstanceKey,
  Field extends string,
  KeyField extends string,
> =
  ContextualKeyedOutMessageConfig<
    BlockValue,
    ParentModelSchema['Type'],
    ParentMessageSchema['Type'],
    ParentOutMessage<ParentOutMessageSchema>,
    KeyForConfig<Keys, BlockValue, ParentModelSchema, KeyValue, Field, KeyField>
  > extends Readonly<{ outMessage: infer OutMessage }>
    ? OutMessage
    : never

type StaticSubscriptionsContext<
  BlockValue extends BindableBlock,
  ParentModel,
> = Readonly<{
  /** Gates only Subscription Streams while the child is present; other lifecycle channels and updates remain enabled. */
  when?:
    | ((model: ParentModel) => boolean)
    | Readonly<
        Partial<
          globalThis.Record<
            keyof BlockValue['subscriptions'],
            (model: ParentModel) => boolean
          >
        >
      >
}>

type KeyedSubscriptionsContext<
  BlockValue extends BindableBlock,
  ParentModel,
  Key,
> = Readonly<{
  /** Gates only Subscription Streams while the child is present; other lifecycle channels and updates remain enabled. */
  when?:
    | ((model: ParentModel, key: Key) => boolean)
    | Readonly<
        Partial<
          globalThis.Record<
            keyof BlockValue['subscriptions'],
            (model: ParentModel, key: Key) => boolean
          >
        >
      >
}>

type GeneratedDeliveryContext<
  BlockValue extends BindableBlock,
  ParentModel,
  Key = never,
> = [ChildUpdateContext<BlockValue>] extends [readonly []]
  ? Readonly<{
      /** Admits generated child Messages for update delivery. It does not change child presence or explicit operations. */
      when?: [Key] extends [never]
        ? (model: ParentModel) => boolean
        : (model: ParentModel, key: Key) => boolean
      toUpdateContext?: never
    }>
  : Readonly<{
      /** Admits generated child Messages for update delivery. It does not change child presence or explicit operations. */
      when?: [Key] extends [never]
        ? (model: ParentModel) => boolean
        : (model: ParentModel, key: Key) => boolean
      /** Maps the current parent Model and optional key to the child's exact extra update arguments. It never reinserts the child Message or key. */
      toUpdateContext: [Key] extends [never]
        ? (model: ParentModel) => ChildUpdateContext<BlockValue>
        : (model: ParentModel, key: Key) => ChildUpdateContext<BlockValue>
    }>

type GeneratedDeliveryRequirement<
  BlockValue extends BindableBlock,
  ParentModel,
  Key = never,
> = [ChildUpdateContext<BlockValue>] extends [readonly []]
  ? Readonly<{
      delivery?: GeneratedDeliveryContext<BlockValue, ParentModel, Key>
    }>
  : Readonly<{
      delivery: GeneratedDeliveryContext<BlockValue, ParentModel, Key>
    }>

type InitialContext<
  Keys,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Field extends string,
  KeyField extends string,
  InitialArguments extends ReadonlyArray<unknown>,
  ChildInitContext,
> =
  | ('field' extends Keys ? ('key' extends Keys ? never : false) : never)
  | ([] extends Parameters<BlockValue['init']>
      ? true & Readonly<{ contextToArgs?: never }>
      : never)
  | Readonly<{
      /** Selects child init arguments from the parent-prepared ChildInitContext; Option may leave direct optional storage absent. */
      contextToArgs: (
        ...context: [ChildInitContext] extends [never]
          ? ReadonlyArray<any>
          : [childInitContext: ChildInitContext]
      ) =>
        | Readonly<Parameters<BlockValue['init']>>
        | Option.Option<Readonly<Parameters<BlockValue['init']>>>
      toParentFields?: never
      instances?: never
      toItem?: never
    }>
  | Readonly<{
      /** Selects child init arguments from the parent-prepared ChildInitContext. */
      contextToArgs: (
        ...context: [ChildInitContext] extends [never]
          ? ReadonlyArray<any>
          : [childInitContext: ChildInitContext]
      ) => Readonly<Parameters<BlockValue['init']>>
      /** Projects the initialized child into exactly one declared parent storage field. */
      toParentFields: (
        childModel: BlockValue['Model']['Type'],
      ) => AccessorInitialProjection<
        ParentModelSchema['Type'],
        BlockValue['Model']['Type']
      >
      instances?: never
      toItem?: never
    }>
  | Readonly<{
      /** Selects initial keyed instances in their Command collection order. */
      instances: (
        ...context: [ChildInitContext] extends [never]
          ? ReadonlyArray<any>
          : [childInitContext: ChildInitContext]
      ) => ReadonlyArray<
        InitialWrappedOccurrence<
          BlockValue,
          ParentModelSchema['Type'],
          Extract<Field, keyof ParentModelSchema['Type'] & string>,
          KeyField,
          InitialArguments
        >
      >
      /**
       * Keeps the exact initialized child and planned key, adding parent-owned
       * wrapper fields when needed. Return a plain wrapper record: a Schema
       * constructor can reconstruct its nested child and fail the runtime
       * identity check. Composition constructs the full parent Model afterward.
       */
      toItem: (
        occurrence: InitialWrappedOccurrence<
          BlockValue,
          ParentModelSchema['Type'],
          Extract<Field, keyof ParentModelSchema['Type'] & string>,
          KeyField
        >,
        childModel: BlockValue['Model']['Type'],
      ) => WrappedItemAt<
        ParentModelSchema['Type'],
        Extract<Field, keyof ParentModelSchema['Type'] & string>
      >
      contextToArgs?: never
      toParentFields?: never
    }>

type StorageConfigKey =
  | 'field'
  | 'childField'
  | 'readAll'
  | 'key'
  | 'read'
  | 'write'
  | 'writeAt'

type StorageContextualProperty<
  Key extends StorageConfigKey,
  Keys,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ReadAll,
  KeyValue extends InstanceKey,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
> = Key extends 'field'
  ? Field
  : Key extends 'childField'
    ? ChildField
    : Key extends 'readAll'
      ? ReadAll
      : Key extends 'key'
        ? 'readAll' extends Keys
          ? (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue
          : KeyField
        : Key extends 'read'
          ? 'readAll' extends Keys
            ? (
                item: ItemOfReadAll<NoInfer<ReadAll>>,
              ) => BlockValue['Model']['Type']
            : (
                model: ParentModelSchema['Type'],
              ) => Option.Option<BlockValue['Model']['Type']>
          : Key extends 'write'
            ? (
                model: ParentModelSchema['Type'],
                nextChildModel: BlockValue['Model']['Type'],
              ) => ParentModelSchema['Type']
            : Key extends 'writeAt'
              ? (
                  model: ParentModelSchema['Type'],
                  key: NoInfer<KeyValue>,
                  nextChildModel: BlockValue['Model']['Type'],
                ) => ParentModelSchema['Type']
              : never

type BindChildContextualProperties<
  Keys extends BindChildConfigKey,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  ReadAll,
  KeyValue extends InstanceKey,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
  InitialArguments extends ReadonlyArray<unknown>,
  ChildInitContext,
> = {
  [
    Key in keyof Pick<BindChildConfigDocumentation, Keys>
  ]: Key extends StorageConfigKey
    ? StorageContextualProperty<
        Key,
        Keys,
        BlockValue,
        ParentModelSchema,
        ReadAll,
        KeyValue,
        Field,
        KeyField,
        ChildField
      >
    : Key extends 'init'
      ? InitialContext<
          Keys,
          BlockValue,
          ParentModelSchema,
          Field,
          KeyField,
          InitialArguments,
          ChildInitContext
        >
      : Key extends 'placement'
        ? string
        : Key extends 'init'
          ? unknown
          : Key extends 'presentWhen'
            ? (model: ParentModelSchema['Type']) => boolean
            : Key extends 'subscriptions'
              ? 'key' extends Keys
                ? KeyedSubscriptionsContext<
                    BlockValue,
                    ParentModelSchema['Type'],
                    KeyForConfig<
                      Keys,
                      BlockValue,
                      ParentModelSchema,
                      KeyValue,
                      Field,
                      KeyField
                    >
                  >
                : StaticSubscriptionsContext<
                    BlockValue,
                    ParentModelSchema['Type']
                  >
              : Key extends 'outMessage'
                ? 'key' extends Keys
                  ? ContextualOutMessagePolicy<
                      KeyedOutMessageContext<
                        Keys,
                        BlockValue,
                        ParentModelSchema,
                        ParentMessageSchema,
                        ParentOutMessageSchema,
                        KeyValue,
                        Field,
                        KeyField
                      >
                    >
                  : ContextualOutMessagePolicy<
                      StaticOutMessageContext<
                        BlockValue,
                        ParentModelSchema,
                        ParentMessageSchema,
                        ParentOutMessageSchema
                      >
                    >
                : Key extends 'delivery'
                  ? GeneratedDeliveryContext<
                      BlockValue,
                      ParentModelSchema['Type'],
                      'key' extends Keys
                        ? KeyForConfig<
                            Keys,
                            BlockValue,
                            ParentModelSchema,
                            KeyValue,
                            Field,
                            KeyField
                          >
                        : never
                    >
                  : Key extends 'keySchema'
                    ? never
                    : unknown
}

type DefaultPlacementOfConfig<BlockValue extends BindableBlock, Config> =
  Config extends Readonly<{ key: unknown }>
    ? BlockId<BlockValue>
    : Config extends Readonly<{ field: infer Field extends string }>
      ? Field
      : BlockId<BlockValue>

type PlacementOfConfig<BlockValue extends BindableBlock, Config> =
  Config extends Readonly<{ placement: infer Placement extends string }>
    ? Placement
    : 'placement' extends keyof Config
      ?
          | Extract<Config['placement'], string>
          | DefaultPlacementOfConfig<BlockValue, Config>
      : DefaultPlacementOfConfig<BlockValue, Config>

type InitialOfConfig<Config> =
  Config extends Readonly<{ init: infer Initial }>
    ? Readonly<{ init: Initial }>
    : undefined

type ResolverOfConfig<Config> =
  Config extends Readonly<{
    init: Readonly<{
      contextToArgs: infer Resolver extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? Resolver
    : never

type ProjectedModelOfConfig<Config> =
  Config extends Readonly<{
    init: Readonly<{
      toParentFields: (...args: ReadonlyArray<any>) => infer ProjectedModel
    }>
  }>
    ? ProjectedModel
    : never

type InstancesOfConfig<Config> =
  Config extends Readonly<{
    init: Readonly<{
      instances: infer Instances extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? Instances
    : never

type KeyedBindingResultForConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  Key extends InstanceKey,
> =
  UsesGeneratedDelivery<BlockValue> extends true
    ? KeySchemaForConfig<
        BlockValue,
        ParentModelSchema,
        Config
      > extends infer KeySchema extends Schema.Top
      ? GeneratedKeyedBindingReturn<
          BlockValue,
          ParentModelSchema,
          ParentMessageSchema,
          ParentOutMessageSchema,
          KeySchema,
          PlacementOfConfig<BlockValue, Config>,
          PolicyOfConfig<Config>
        >
      : never
    : KeyedBinding<
        BlockValue,
        ParentModelSchema['Type'],
        ParentMessageSchema['Type'],
        Key,
        PlacementOfConfig<BlockValue, Config>,
        PolicyOf<BlockValue, PolicyOfConfig<Config>>,
        ParentModelSchema['Type'],
        ParentMessageSchema['Type'],
        ParentOutMessage<ParentOutMessageSchema>,
        never,
        never
      >

type StorageOfConfig<Config> =
  Config extends BindingStorageEvidence<infer Storage>
    ? Storage
    : Config extends Readonly<{ field: infer Field extends string }>
      ? Config extends Readonly<{ readAll: unknown }>
        ? never
        : Config extends Readonly<{ key: infer KeyField extends string }>
          ? Readonly<{
              kind: 'KeyedField'
              field: Field
              keyField: KeyField
              childField: Config extends Readonly<{
                childField: infer ChildField extends string
              }>
                ? ChildField
                : never
            }>
          : Readonly<{ kind: 'Direct'; field: Field }>
      : never

type BindChildResultForConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  ChildInitContext,
> =
  Config extends Readonly<{
    readAll: (...args: ReadonlyArray<any>) => ReadonlyArray<unknown>
    key: (...args: ReadonlyArray<any>) => infer Key extends InstanceKey
  }>
    ? KeyedBindingResultForConfig<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        Config,
        Key
      >
    : Config extends Readonly<{
          childField: string
          field: infer Field extends keyof ParentModelSchema['Type'] & string
          key: infer KeyField extends string
        }>
      ? InitialOfConfig<Config> extends Readonly<{
          init: Readonly<{
            instances: (...args: ReadonlyArray<any>) => any
          }>
        }>
        ? InitializedKeyedBinding<
            KeyedBindingResultForConfig<
              BlockValue,
              ParentModelSchema,
              ParentMessageSchema,
              ParentOutMessageSchema,
              Config,
              KeyAt<WrappedItemAt<ParentModelSchema['Type'], Field>, KeyField>
            >,
            BlockValue,
            ParentModelSchema['Type'],
            Field,
            PlacementOfConfig<BlockValue, Config>,
            InstancesOfConfig<Config>,
            ChildInitContext
          >
        : KeyedBindingResultForConfig<
            BlockValue,
            ParentModelSchema,
            ParentMessageSchema,
            ParentOutMessageSchema,
            Config,
            KeyAt<WrappedItemAt<ParentModelSchema['Type'], Field>, KeyField>
          >
      : Config extends Readonly<{
            field: infer Field extends keyof ParentModelSchema['Type'] & string
            key: infer KeyField extends keyof BlockValue['Model']['Type'] &
              string
          }>
        ? InitialOfConfig<Config> extends Readonly<{
            init: Readonly<{
              instances: (...args: ReadonlyArray<any>) => any
            }>
          }>
          ? InitializedKeyedBinding<
              KeyedBindingResultForConfig<
                BlockValue,
                ParentModelSchema,
                ParentMessageSchema,
                ParentOutMessageSchema,
                Config,
                KeyAt<BlockValue['Model']['Type'], KeyField>
              >,
              BlockValue,
              ParentModelSchema['Type'],
              Field,
              PlacementOfConfig<BlockValue, Config>,
              InstancesOfConfig<Config>,
              ChildInitContext
            >
          : KeyedBindingResultForConfig<
              BlockValue,
              ParentModelSchema,
              ParentMessageSchema,
              ParentOutMessageSchema,
              Config,
              KeyAt<BlockValue['Model']['Type'], KeyField>
            >
        : Config extends Readonly<{
              field: infer Field extends keyof ParentModelSchema['Type'] &
                string
            }>
          ? UsesGeneratedDelivery<BlockValue> extends true
            ? GeneratedDirectBindingResult<
                BlockValue,
                ParentModelSchema,
                ParentMessageSchema,
                ParentOutMessageSchema,
                Field,
                PlacementOfConfig<BlockValue, Config>,
                PolicyOfConfig<Config>,
                InitialOfConfig<Config>,
                ChildInitContext
              >
            : MessageFreeDirectBindingResult<
                BlockValue,
                ParentModelSchema,
                ParentMessageSchema,
                ParentOutMessageSchema,
                Field,
                PlacementOfConfig<BlockValue, Config>,
                PolicyOfConfig<Config>,
                InitialOfConfig<Config>,
                ChildInitContext
              >
          : Config extends Readonly<{
                init: Readonly<{
                  toParentFields: (...args: ReadonlyArray<any>) => any
                }>
              }>
            ? UsesGeneratedDelivery<BlockValue> extends true
              ? GeneratedAccessorBindingResult<
                  BlockValue,
                  ParentModelSchema,
                  ParentMessageSchema,
                  ParentOutMessageSchema,
                  ProjectedModelOfConfig<Config>,
                  PlacementOfConfig<BlockValue, Config>,
                  PolicyOfConfig<Config>,
                  ResolverOfConfig<Config>,
                  ChildInitContext
                >
              : MessageFreeAccessorBindingResult<
                  BlockValue,
                  ParentModelSchema,
                  ParentMessageSchema,
                  ParentOutMessageSchema,
                  ProjectedModelOfConfig<Config>,
                  PlacementOfConfig<BlockValue, Config>,
                  PolicyOfConfig<Config>,
                  ResolverOfConfig<Config>,
                  ChildInitContext
                >
            : UsesGeneratedDelivery<BlockValue> extends true
              ? GeneratedDirectBindingReturn<
                  BlockValue,
                  ParentModelSchema,
                  ParentMessageSchema,
                  ParentOutMessageSchema,
                  PlacementOfConfig<BlockValue, Config>,
                  PolicyOfConfig<Config>
                >
              : MessageFreeBindingReturn<
                  BlockValue,
                  ParentModelSchema,
                  ParentMessageSchema,
                  ParentOutMessageSchema,
                  PlacementOfConfig<BlockValue, Config>,
                  PolicyOfConfig<Config>
                >

declare const PendingOutMessagePolicyTypeId: unique symbol

/** @internal Marks a Binding whose policy must be selected before Composition. */
export interface UnselectedOutMessagePolicy {
  readonly [PendingOutMessagePolicyTypeId]: true
}

type KeyOfBindingConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Config,
> =
  Config extends Readonly<{
    readAll: (...args: ReadonlyArray<any>) => ReadonlyArray<unknown>
    keySchema: infer KeySchema extends Schema.Top
  }>
    ? Extract<KeySchema['Type'], InstanceKey>
    : Config extends Readonly<{
          readAll: (...args: ReadonlyArray<any>) => ReadonlyArray<unknown>
          key: (...args: ReadonlyArray<any>) => infer Key extends InstanceKey
        }>
      ? Key
      : Config extends Readonly<{
            childField: string
            field: infer Field extends keyof ParentModelSchema['Type'] & string
            key: infer KeyField extends string
          }>
        ? KeyAt<WrappedItemAt<ParentModelSchema['Type'], Field>, KeyField>
        : Config extends Readonly<{
              field: string
              key: infer KeyField extends keyof BlockValue['Model']['Type'] &
                string
            }>
          ? KeyAt<BlockValue['Model']['Type'], KeyField>
          : never

type OutMessagePolicyForBindingConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
> =
  Config extends Readonly<{ key: unknown }>
    ? ContextualKeyedOutMessageConfig<
        BlockValue,
        ParentModelSchema['Type'],
        ParentMessageSchema['Type'],
        ParentOutMessage<ParentOutMessageSchema>,
        KeyOfBindingConfig<BlockValue, ParentModelSchema, Config>
      > extends Readonly<{ outMessage: infer Policy }>
      ? Policy
      : never
    : StaticOutMessageContext<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema
      >

type InvalidOutMessageHelperMember<BlockValue, Key, Candidate> =
  Candidate extends OutMessageHelperEvidence<
    infer HelperOutMessage,
    infer HelperRole
  >
    ? IsAny<HelperOutMessage> extends true
      ? Key
      : IsUnknown<HelperOutMessage> extends true
        ? Key
        : Equal<Key, HelperRole> extends true
          ? BlockValue extends Readonly<{
              OutMessage: Readonly<{
                Type: infer ChildOutMessage
                match: (...args: ReadonlyArray<any>) => any
              }>
            }>
            ? Equal<HelperOutMessage, ChildOutMessage> extends true
              ? never
              : Key
            : Key
          : Key
    : never

type InvalidOutMessageHelperPolicyKeys<BlockValue, Policy> =
  Policy extends unknown
    ? {
        [Key in keyof Policy]-?: InvalidOutMessageHelperMember<
          BlockValue,
          Key,
          NonNullable<Policy[Key]>
        >
      }[keyof Policy]
    : never

type ValidateOutMessageHelperPolicy<BlockValue, Policy> = [
  InvalidOutMessageHelperPolicyKeys<BlockValue, Policy>,
] extends [never]
  ? unknown
  : Readonly<{
      'OutMessage helpers must use the exact tagged-union child OutMessage contract': InvalidOutMessageHelperPolicyKeys<
        BlockValue,
        Policy
      >
    }>

/** Selects the exact parent-owned OutMessage policy for a child Binding. */
export interface WithOutMessagePolicy<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  ChildInitContext,
> {
  <const Policy>(
    policy: Policy &
      ContextualOutMessagePolicy<
        OutMessagePolicyForBindingConfig<
          BlockValue,
          ParentModelSchema,
          ParentMessageSchema,
          ParentOutMessageSchema,
          Config
        >
      > &
      ValidateOutMessageHelperPolicy<BlockValue, NoInfer<Policy>>,
  ): SelectedChildBinding<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Config,
    ChildInitContext,
    Policy
  >
}

/** A fully usable child Binding with an exact selected OutMessage policy. */
export type SelectedChildBinding<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  ChildInitContext,
  Policy,
> = BindChildResultForConfig<
  BlockValue,
  ParentModelSchema,
  ParentMessageSchema,
  ParentOutMessageSchema,
  Config & Readonly<{ outMessage: Policy }>,
  ChildInitContext
> &
  BindingStorageEvidence<StorageOfConfig<Config>> &
  Readonly<{
    /** Selects another Composition-local policy for the same child occurrence.
     * The returned full Binding is immutable and the current Binding remains
     * unchanged. */
    withOutMessagePolicy: WithOutMessagePolicy<
      BlockValue,
      ParentModelSchema,
      ParentMessageSchema,
      ParentOutMessageSchema,
      Config,
      ChildInitContext
    >
  }>

/** A full child Binding whose parent-owned OutMessage policy must be selected
 * before Composition registration. */
export type BindingWithoutOutMessagePolicy<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  ChildInitContext,
> = BindChildResultForConfig<
  BlockValue,
  ParentModelSchema,
  ParentMessageSchema,
  ParentOutMessageSchema,
  Config & Readonly<{ outMessage: UnselectedOutMessagePolicy }>,
  ChildInitContext
> &
  BindingStorageEvidence<StorageOfConfig<Config>> &
  Readonly<{
    /** Selects a Composition-local OutMessage policy for this child occurrence.
     * The returned full Binding is immutable and this Binding remains
     * unchanged. Composition reports an error when this Binding is registered
     * without selecting a policy. */
    withOutMessagePolicy: WithOutMessagePolicy<
      BlockValue,
      ParentModelSchema,
      ParentMessageSchema,
      ParentOutMessageSchema,
      Config,
      ChildInitContext
    >
  }>

/** @internal The result of a fully validated child Binding configuration. */
export type BindChildConstructorResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  ChildInitContext,
> =
  BlockValue extends Readonly<{ OutMessage: Readonly<{ Type: unknown }> }>
    ? BindingWithoutOutMessagePolicy<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        Config,
        ChildInitContext
      >
    : BindChildResultForConfig<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        Config,
        ChildInitContext
      > &
        BindingStorageEvidence<StorageOfConfig<Config>>

/** Creates a static, optional, or keyed child Binding in this Definition's
 * parent Model, Message, and OutMessage context.
 *
 * Register the returned Binding in the same Definition's Composition. A
 * Binding created by another Definition is rejected even when its structural
 * Model and Message types happen to match. Its Composition validates policy
 * outputs and the sibling Bindings used by those policies. Creating the Binding
 * records passive composition policy; a Runtime starts its lifecycle work later. */
interface BindChildConstructor<
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined = undefined,
  ChildInitContext = never,
> {
  <
    const BlockValue extends BindableBlock,
    const Keys extends BindChildConfigKey,
    const ReadAll extends (
      model: ParentModelSchema['Type'],
    ) => ReadonlyArray<unknown>,
    const KeyValue extends InstanceKey,
    const Field extends string,
    const KeyField extends string,
    const ChildField extends string,
    const Source extends object,
    const InitialArguments extends Parameters<BlockValue['init']> = Parameters<
      BlockValue['init']
    >,
  >(
    block: BlockValue,
    config: Source &
      Readonly<{ outMessage?: never }> &
      BindChildContextualProperties<
        Keys,
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        ReadAll,
        KeyValue,
        Field,
        KeyField,
        ChildField,
        InitialArguments,
        ChildInitContext
      > &
      Readonly<{
        readAll?: never
        key?: KeyField
        field?: Field
        childField?: ChildField
        writeAt?: never
      }> &
      ([BlockValue['Message']['Type']] extends [never]
        ? Readonly<{ delivery?: never; keySchema?: never }>
        : GeneratedDeliveryRequirement<
            BlockValue,
            ParentModelSchema['Type'],
            'key' extends Keys
              ? KeyForConfig<
                  Keys,
                  BlockValue,
                  ParentModelSchema,
                  KeyValue,
                  Field,
                  KeyField
                >
              : never
          >),
    ...validation: readonly [
      ...ValidateStaticBindingConfigWithoutPolicy<
        BlockValue,
        ParentModelSchema,
        NoInfer<Keys>,
        NoInfer<Field>,
        NoInfer<KeyField>,
        NoInfer<ChildField>,
        NoInfer<Source>
      >,
      ...ValidateConcreteCompositionArguments<BlockValue>,
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Source,
    ChildInitContext
  >
  <
    const BlockValue extends BindableBlock &
      Readonly<{ Message: Readonly<{ Type: never }> }>,
    const Keys extends GeneralKeyedConfigKey,
    const ReadAll extends (
      model: ParentModelSchema['Type'],
    ) => ReadonlyArray<any>,
    const KeyValue extends InstanceKey,
    const Source extends object = object,
  >(
    block: BlockValue,
    config: Source &
      Readonly<{ outMessage?: never }> &
      GeneralKeyedContextualProperties<
        Keys,
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        ReadAll,
        (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue,
        KeyValue
      > &
      Readonly<{
        readAll: ReadAll
        key: (item: ItemOfReadAll<NoInfer<ReadAll>>) => KeyValue
        read: (
          item: ItemOfReadAll<NoInfer<ReadAll>>,
        ) => BlockValue['Model']['Type']
        writeAt: (
          model: ParentModelSchema['Type'],
          key: KeyValue,
          nextChildModel: BlockValue['Model']['Type'],
        ) => ParentModelSchema['Type']
        field?: never
        childField?: never
        presentWhen?: never
        init?: never
        write?: never
        delivery?: never
        keySchema?: never
      }>,
    ...validation: readonly [
      ...ValidateGeneralKeyedSourceWithoutPolicy<NoInfer<Source>>,
      ...ValidateConcreteCompositionArguments<BlockValue>,
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Source,
    ChildInitContext
  >
  <
    const BlockValue extends BindableBlock,
    const Keys extends GeneralKeyedConfigKey,
    const ReadAll extends (
      model: ParentModelSchema['Type'],
    ) => ReadonlyArray<any>,
    const KeyOf extends (item: ItemOfReadAll<NoInfer<ReadAll>>) => InstanceKey,
    const KeyValue extends Extract<ReturnType<KeyOf>, InstanceKey> = Extract<
      ReturnType<KeyOf>,
      InstanceKey
    >,
    const Source extends object = object,
  >(
    block: BlockValue,
    config: Source &
      Readonly<{ outMessage?: never }> &
      GeneralKeyedContextualProperties<
        Keys,
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        ReadAll,
        KeyOf,
        KeyValue
      > &
      Readonly<{
        readAll: ReadAll
        key: KeyOf
        read: (
          item: ItemOfReadAll<NoInfer<ReadAll>>,
        ) => BlockValue['Model']['Type']
        writeAt: (
          model: ParentModelSchema['Type'],
          key: KeyValue,
          nextChildModel: BlockValue['Model']['Type'],
        ) => ParentModelSchema['Type']
        field?: never
        childField?: never
        presentWhen?: never
        init?: never
        write?: never
      }> &
      ([BlockValue['Message']['Type']] extends [never]
        ? Readonly<{
            delivery?: never
            keySchema?: never
          }>
        : Readonly<{
            keySchema: Schema.Top & Schema.Schema<KeyValue>
          }> &
            GeneratedDeliveryRequirement<
              BlockValue,
              ParentModelSchema['Type'],
              KeyValue
            >),
    ...validation: readonly [
      ...ValidateGeneralKeyedSourceWithoutPolicy<NoInfer<Source>>,
      ...ValidateConcreteCompositionArguments<BlockValue>,
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Source,
    ChildInitContext
  >
}

/** Creates a child Binding before selecting its exact parent-owned policy with
 * `withOutMessagePolicy`. */
export interface BindChild<
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined = undefined,
  ChildInitContext = never,
> extends BindChildConstructor<
  ParentModelSchema,
  ParentMessageSchema,
  ParentOutMessageSchema,
  ChildInitContext
> {}

const assertGeneralKeyedConfig = (config: object): void => {
  const allowedFields = new Set([
    'placement',
    'readAll',
    'key',
    'read',
    'writeAt',
    'subscriptions',
    'outMessage',
    'field',
    'childField',
    'presentWhen',
    'delivery',
    'keySchema',
  ])
  for (const configField of Reflect.ownKeys(config)) {
    if (!Predicate.isString(configField) || !allowedFields.has(configField)) {
      throw new Error(
        `[foldkit] A general keyed Binding does not support the config field "${globalThis.String(configField)}".`,
      )
    }
  }

  for (const forbiddenField of ['field', 'childField', 'presentWhen']) {
    if (Object.hasOwn(config, forbiddenField)) {
      throw new Error(
        forbiddenField === 'childField'
          ? '[foldkit] A general keyed Binding cannot supply childField.'
          : '[foldkit] A general keyed Binding cannot supply field or presentWhen.',
      )
    }
  }

  for (const functionField of ['readAll', 'key', 'read', 'writeAt']) {
    if (!Predicate.isFunction(Reflect.get(config, functionField))) {
      throw new Error(
        `[foldkit] A general keyed Binding requires a ${functionField} function.`,
      )
    }
  }
}

const isNeverSchema = (schema: unknown): boolean => {
  if (!Schema.isSchema(schema)) {
    return false
  }

  const visit = (sourceAst: SchemaAST.AST): boolean => {
    const ast = SchemaAST.toType(sourceAst)
    if (SchemaAST.isSuspend(ast)) {
      return visit(ast.thunk())
    }

    return SchemaAST.isNever(ast)
  }

  return visit(schema.ast)
}

const usesGeneratedDelivery = (childMessage: unknown): boolean =>
  !isNeverSchema(childMessage)

const generatedKeySchema = (
  block: BindableBlock,
  parentModel: Schema.Top,
  config: object,
): Schema.Top => {
  const configuredKeySchema = Reflect.get(config, 'keySchema')
  if (configuredKeySchema !== undefined) {
    if (!isInstanceKeySchema(configuredKeySchema)) {
      throw new Error(
        '[foldkit] A generated general keyed Binding keySchema must decode to a string or number.',
      )
    }
    return configuredKeySchema
  }

  if (isKeyedMapFieldStorage(parentModel, Reflect.get(config, 'field'))) {
    const parentFields = Reflect.get(parentModel, 'fields')
    const storageSchema =
      Predicate.isObject(parentFields) &&
      Predicate.isString(Reflect.get(config, 'field'))
        ? Reflect.get(parentFields, Reflect.get(config, 'field'))
        : undefined
    const keySchema = Schema.isSchema(storageSchema)
      ? Reflect.get(storageSchema, 'key')
      : undefined
    if (!isInstanceKeySchema(keySchema)) {
      throw new Error(
        '[foldkit] A generated keyed map Binding requires a string or finite-number key Schema.',
      )
    }

    return keySchema
  }

  const key = Reflect.get(config, 'key')
  const field = Reflect.get(config, 'field')
  const childField = Reflect.get(config, 'childField')
  const source = childField === undefined ? block.Model : parentModel
  const fields = Reflect.get(source, 'fields')
  if (!Predicate.isString(key) || !Predicate.isObject(fields)) {
    throw new Error(
      '[foldkit] A generated keyed Binding requires a derivable key Schema.',
    )
  }

  let keyFields: unknown = fields
  if (childField !== undefined) {
    const arraySchema = Predicate.isString(field)
      ? Reflect.get(fields, field)
      : undefined
    const keyOwner = Schema.isSchema(arraySchema)
      ? Reflect.get(arraySchema, 'value')
      : undefined
    keyFields = Schema.isSchema(keyOwner)
      ? Reflect.get(keyOwner, 'fields')
      : undefined
  }
  const keySchema =
    Predicate.isObject(keyFields) && Object.hasOwn(keyFields, key)
      ? Reflect.get(keyFields, key)
      : undefined
  if (!isInstanceKeySchema(keySchema)) {
    throw new Error(
      '[foldkit] A generated keyed Binding requires a string or finite-number key Schema.',
    )
  }

  return keySchema
}

const generatedDelivery = (
  block: BindableBlock,
  parentModel: Schema.Top,
  config: object,
  isKeyed: boolean,
): Readonly<{
  config: object
  envelope: Schema.Top
  fromParentMessage: RuntimeFromParentMessage
  validateSelectedKey?: (key: unknown) => void
}> => {
  const field = Reflect.get(config, 'field')
  const configuredPlacement = Reflect.get(config, 'placement')
  let placement: unknown = configuredPlacement
  if (placement === undefined) {
    placement = isKeyed || !Predicate.isString(field) ? block.owner.id : field
  }

  if (!Predicate.isString(placement)) {
    throw new Error(
      '[foldkit] A generated Binding requires a string placement.',
    )
  }
  if (!Schema.isSchema(block.Message)) {
    throw new Error(
      '[foldkit] A generated Binding requires a child Message Schema.',
    )
  }

  const keySchema = isKeyed
    ? generatedKeySchema(block, parentModel, config)
    : undefined
  const isGeneratedKey =
    keySchema === undefined ? undefined : Schema.is(keySchema)

  const delivery = Reflect.get(config, 'delivery')
  if (delivery !== undefined && !Predicate.isObject(delivery)) {
    throw new Error('[foldkit] Binding delivery must be an object.')
  }
  if (Predicate.isObject(delivery)) {
    for (const deliveryField of Reflect.ownKeys(delivery)) {
      if (deliveryField !== 'when' && deliveryField !== 'toUpdateContext') {
        throw new Error(
          `[foldkit] Binding delivery does not support the field "${globalThis.String(deliveryField)}".`,
        )
      }
    }
    for (const deliveryField of ['when', 'toUpdateContext']) {
      const value = Reflect.get(delivery, deliveryField)
      if (value !== undefined && !Predicate.isFunction(value)) {
        throw new Error(
          `[foldkit] Binding delivery.${deliveryField} must be a function.`,
        )
      }
    }
  }

  const toUpdateContext = Predicate.isObject(delivery)
    ? Reflect.get(delivery, 'toUpdateContext')
    : undefined
  if (hasObservableUpdateContext(block.update)) {
    if (!Predicate.isFunction(toUpdateContext)) {
      throw new Error(
        '[foldkit] A contextual child update requires delivery.toUpdateContext.',
      )
    }
  }

  const tag = childMessageTag(placement)
  const envelope = isKeyed
    ? Reflect.apply(makeChildEnvelopeSchema, undefined, [
        placement,
        block.Message,
        keySchema,
      ])
    : makeChildEnvelopeSchema(placement, block.Message)
  const toParentMessage = isKeyed
    ? (key: unknown, message: unknown) => ({
        _tag: tag,
        placement,
        generation: 0,
        key,
        message,
      })
    : (message: unknown) => ({
        _tag: tag,
        placement,
        generation: 0,
        message,
      })
  const when = Predicate.isObject(delivery)
    ? Reflect.get(delivery, 'when')
    : undefined
  const fromParentMessage: RuntimeFromParentMessage = {
    parentMessage: envelope,
    args: (model: unknown, message: Readonly<{ _tag: string }>) => {
      const key = isKeyed ? Reflect.get(message, 'key') : undefined
      if (
        Predicate.isFunction(when) &&
        !Reflect.apply(when, undefined, isKeyed ? [model, key] : [model])
      ) {
        return Option.none()
      }

      const context = Predicate.isFunction(toUpdateContext)
        ? Reflect.apply(
            toUpdateContext,
            undefined,
            isKeyed ? [model, key] : [model],
          )
        : []
      if (!globalThis.Array.isArray(context)) {
        throw new Error(
          '[foldkit] Binding delivery.toUpdateContext must return the child update context tuple.',
        )
      }

      return Option.some(
        isKeyed
          ? [key, Reflect.get(message, 'message'), ...context]
          : [Reflect.get(message, 'message'), ...context],
      )
    },
  }
  const bindingConfig = {}
  for (const configField of Reflect.ownKeys(config)) {
    if (configField !== 'delivery' && configField !== 'keySchema') {
      Reflect.set(bindingConfig, configField, Reflect.get(config, configField))
    }
  }

  return {
    envelope,
    fromParentMessage,
    ...(isGeneratedKey === undefined
      ? {}
      : {
          validateSelectedKey: (key: unknown) => {
            if (!isGeneratedKey(key)) {
              throw new Error(
                `[foldkit] Generated keyed child Binding "${placement}" key selector returned a value that does not satisfy its key Schema.`,
              )
            }
          },
        }),
    config: {
      ...bindingConfig,
      placement,
      toParentMessage,
    },
  }
}

const registerDirectInitialPolicy = (
  binding: object,
  block: BindableBlock,
  parentModel: AnySchema,
  config: object,
): void => {
  const field = Reflect.get(config, 'field')
  if (!Predicate.isString(field)) {
    throw new Error(
      '[foldkit] A direct child init policy requires a string Model field.',
    )
  }

  const fields = Reflect.get(parentModel, 'fields')
  const fieldSchema = Predicate.isObject(fields)
    ? Reflect.get(fields, field)
    : undefined
  const isOptional = !hasSameDecodedSchemaShape(fieldSchema, block.Model)
  registerBindingStorage(binding, { kind: 'Direct', field, isOptional })
  const isExplicit = Object.hasOwn(config, 'init')

  if (!isExplicit && isOptional) {
    return
  }

  const init = isExplicit ? Reflect.get(config, 'init') : true
  if (init === false) {
    return
  }

  if (init !== true && !Predicate.isObject(init)) {
    throw new Error(
      `[foldkit] Direct Binding field "${field}" init must be false, true, or an object with a contextToArgs function.`,
    )
  }

  if (init === true && isOptional) {
    throw new Error(
      `[foldkit] Direct optional Binding field "${field}" requires an explicit init.contextToArgs presence policy.`,
    )
  }

  const argumentResolver =
    init === true ? () => [] : Reflect.get(init, 'contextToArgs')
  if (!Predicate.isFunction(argumentResolver)) {
    throw new Error(
      `[foldkit] Direct Binding field "${field}" init must be false, true, or an object with a contextToArgs function.`,
    )
  }

  if (Predicate.isObject(init)) {
    for (const policyField of Reflect.ownKeys(init)) {
      if (policyField !== 'contextToArgs') {
        throw new Error(
          `[foldkit] Direct Binding field "${field}" init does not support the policy field "${globalThis.String(policyField)}".`,
        )
      }
    }
  }

  registerBindingInitialPolicy(binding, {
    kind: 'Direct',
    field,
    isOptional,
    resolveArguments: context => {
      const result = Reflect.apply(argumentResolver, undefined, [context])
      if (isOptional) {
        if (!Option.isOption(result)) {
          throw new Error(
            `[foldkit] Direct optional Binding field "${field}" init.contextToArgs must return an Option of child init arguments.`,
          )
        }
        if (Option.isNone(result)) {
          return Option.none()
        }
        if (!globalThis.Array.isArray(result.value)) {
          throw new Error(
            `[foldkit] Direct optional Binding field "${field}" init.contextToArgs must contain a child init argument tuple.`,
          )
        }
        return Option.some(result.value)
      }

      if (!globalThis.Array.isArray(result)) {
        throw new Error(
          `[foldkit] Direct Binding field "${field}" init.contextToArgs must return a child init argument tuple.`,
        )
      }
      return Option.some(result)
    },
    isStored: model => {
      if (!Predicate.isObject(model) || !Object.hasOwn(model, field)) {
        throw new Error(
          `[foldkit] Composition.makeInit assembled a parent Model without required direct Binding field "${field}".`,
        )
      }

      if (!isOptional) {
        return true
      }

      const value = Reflect.get(model, field)
      if (!Option.isOption(value)) {
        throw new Error(
          `[foldkit] Composition.makeInit assembled direct Binding field "${field}" with a non-Option value.`,
        )
      }
      return Option.isSome(value)
    },
  })
}

const registerAccessorInitialPolicy = (
  binding: object,
  block: BindableBlock,
  parentModel: AnySchema,
  config: object,
): void => {
  if (!Object.hasOwn(config, 'init')) {
    return
  }

  const init = Reflect.get(config, 'init')
  if (!Predicate.isObject(init)) {
    throw new Error(
      '[foldkit] An accessor Binding init policy must be an object with contextToArgs and toParentFields functions.',
    )
  }

  for (const policyField of Reflect.ownKeys(init)) {
    if (policyField !== 'contextToArgs' && policyField !== 'toParentFields') {
      throw new Error(
        `[foldkit] An accessor Binding init policy does not support the field "${globalThis.String(policyField)}".`,
      )
    }
  }

  const argumentResolver = Reflect.get(init, 'contextToArgs')
  const toParentFields = Reflect.get(init, 'toParentFields')
  if (
    !Predicate.isFunction(argumentResolver) ||
    !Predicate.isFunction(toParentFields)
  ) {
    throw new Error(
      '[foldkit] An accessor Binding init policy must supply contextToArgs and toParentFields functions.',
    )
  }

  const fields = Reflect.get(parentModel, 'fields')
  if (!Predicate.isObject(fields)) {
    throw new Error(
      '[foldkit] An accessor Binding init policy requires a parent Struct Model.',
    )
  }

  const allowedFields = Array.filter(
    Reflect.ownKeys(fields),
    (field): field is string => {
      if (!Predicate.isString(field)) {
        return false
      }

      const fieldSchema = Reflect.get(fields, field)
      return (
        Schema.isSchema(fieldSchema) &&
        !SchemaAST.isOptional(fieldSchema.ast) &&
        hasSameDecodedSchemaShape(fieldSchema, block.Model)
      )
    },
  )

  if (Array.isArrayEmpty(allowedFields)) {
    throw new Error(
      '[foldkit] An accessor Binding init.toParentFields requires a required parent Struct field whose decoded type exactly matches the child Model.',
    )
  }

  registerBindingInitialPolicy(binding, {
    kind: 'Projected',
    allowedFields,
    resolveArguments: context => {
      const result = Reflect.apply(argumentResolver, undefined, [context])
      if (!globalThis.Array.isArray(result)) {
        throw new Error(
          '[foldkit] An accessor Binding init.contextToArgs function must return a child init argument tuple.',
        )
      }
      return result
    },
    project: childModel => {
      const projection = Reflect.apply(toParentFields, undefined, [childModel])
      if (!Predicate.isObject(projection)) {
        throw new Error(
          '[foldkit] An accessor Binding init.toParentFields function must return an object containing exactly one parent Model field.',
        )
      }

      const projectedFields = Reflect.ownKeys(projection)
      if (projectedFields.length !== 1) {
        throw new Error(
          '[foldkit] An accessor Binding init.toParentFields function must return exactly one parent Model field.',
        )
      }

      const field = Option.getOrThrow(Array.head(projectedFields))
      if (!Predicate.isString(field) || !allowedFields.includes(field)) {
        throw new Error(
          `[foldkit] Accessor Binding init.toParentFields field "${globalThis.String(field)}" must be a required parent Struct field whose decoded type exactly matches the child Model.`,
        )
      }

      const value = Reflect.get(projection, field)
      if (!Object.is(value, childModel)) {
        throw new Error(
          `[foldkit] Accessor Binding init.toParentFields field "${field}" must contain the initialized child Model it receives.`,
        )
      }

      return { field, value }
    },
    isStored: (model, field) => {
      if (!Predicate.isObject(model) || !Object.hasOwn(model, field)) {
        throw new Error(
          `[foldkit] Composition.makeInit assembled a parent Model without projected Binding field "${field}".`,
        )
      }
      return true
    },
  })
}

const assertBindingConfig: (
  config: unknown,
) => asserts config is object = config => {
  if (!Predicate.isObject(config) || globalThis.Array.isArray(config)) {
    throw new Error(
      '[foldkit] A child Binding requires a configuration object.',
    )
  }

  if (Object.hasOwn(config, 'outMessage')) {
    throw new Error(
      '[foldkit] Definition.makeBinding no longer accepts outMessage. Select a callable policy with Binding.withOutMessagePolicy({ fold, forward }).',
    )
  }
}

/** @internal Creates a parent-owned Binding constructor and records its exact parent contract. */
export const makeBindChild = <
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined = undefined,
>(
  parentContract: Readonly<{
    ownerToken: object
    Model: ParentModelSchema
    Message: ParentMessageSchema
    OutMessage: ParentOutMessageSchema
    ChildInitContext?: AnySchema | undefined
  }>,
): BindChild<ParentModelSchema, ParentMessageSchema, ParentOutMessageSchema> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((block: BindableBlock, providedConfig: unknown): unknown => {
    assertCompletedBlock(block)
    assertBindingConfig(providedConfig)
    const hasOutMessage = Schema.isSchema(Reflect.get(block, 'OutMessage'))
    let currentBinding: Readonly<{ placement: string }> | undefined
    const readBinding = () => {
      if (currentBinding === undefined) {
        throw new Error(
          '[foldkit] A child Binding cannot handle OutMessages before construction finishes.',
        )
      }
      return currentBinding
    }
    const config = hasOutMessage
      ? { ...providedConfig, outMessage: deferredOutMessagePolicy(readBinding) }
      : providedConfig
    const finishBinding = <
      BindingValue extends Readonly<{ placement: string }>,
    >(
      binding: BindingValue,
    ) => {
      currentBinding = binding
      if (hasOutMessage) {
        attachOutMessagePolicy(binding)
      }
      return Object.freeze(binding)
    }

    if (Predicate.isObject(config)) {
      const hasDelivery = Object.hasOwn(config, 'delivery')
      const hasKeySchema = Object.hasOwn(config, 'keySchema')
      if (isNeverSchema(block.Message) && (hasDelivery || hasKeySchema)) {
        throw new Error(
          '[foldkit] A Message-free child cannot configure Message delivery.',
        )
      }

      for (const removedField of [
        'parentMessage',
        'toParentMessage',
        'fromParentMessage',
      ]) {
        if (Object.hasOwn(config, removedField)) {
          throw new Error(
            `[foldkit] Unknown Binding configuration field "${removedField}".`,
          )
        }
      }

      if (hasKeySchema && !Object.hasOwn(config, 'readAll')) {
        throw new Error(
          '[foldkit] keySchema is supported only by generated general keyed Bindings.',
        )
      }
    }

    if (Predicate.isObject(config) && Object.hasOwn(config, 'field')) {
      for (const field of ['Model', 'ChildModel']) {
        if (Object.hasOwn(config, field)) {
          throw new Error(
            `[foldkit] A parent-owned field Binding cannot supply ${field}; its Definition and child Block establish the Model contracts.`,
          )
        }
      }
    }

    if (Predicate.isObject(config) && Object.hasOwn(config, 'readAll')) {
      assertGeneralKeyedConfig(config)
      const generated = usesGeneratedDelivery(block.Message)
        ? generatedDelivery(block, parentContract.Model, config, true)
        : undefined
      const sourceConfig = generated?.config ?? config
      const normalized =
        isNeverSchema(block.Message) &&
        !Predicate.isFunction(Reflect.get(sourceConfig, 'toParentMessage'))
          ? {
              ...sourceConfig,
              toParentMessage: () => {
                throw new Error(
                  '[foldkit] A Message-free child cannot emit a parent Message.',
                )
              },
            }
          : sourceConfig
      const deliveryConfig =
        generated === undefined
          ? normalized
          : {
              ...normalized,
              outgoingParentMessage: generated.envelope,
              fromParentMessage: generated.fromParentMessage,
              validateSelectedKey: generated.validateSelectedKey,
            }

      const binding = bindEach(
        block,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        deliveryConfig as never,
      )
      registerBindingParentContract(binding, parentContract)
      if (generated !== undefined) {
        registerGeneratedDelivery(binding, generated.envelope)
      }
      return finishBinding(binding)
    }

    if (
      Predicate.isObject(config) &&
      Object.hasOwn(config, 'field') &&
      !Object.hasOwn(config, 'key') &&
      isKeyedMapBindingConfig(providedConfig)
    ) {
      const field = Reflect.get(config, 'field')
      const placedConfig = Object.hasOwn(config, 'placement')
        ? config
        : { ...config, placement: field }
      const generated = usesGeneratedDelivery(block.Message)
        ? generatedDelivery(block, parentContract.Model, placedConfig, true)
        : undefined
      const sourceConfig =
        generated?.config ??
        (isNeverSchema(block.Message)
          ? {
              ...placedConfig,
              toParentMessage: () => {
                throw new Error(
                  '[foldkit] A Message-free child cannot emit a parent Message.',
                )
              },
            }
          : placedConfig)
      const normalized = normalizeKeyedMapFieldConfig({
        ...sourceConfig,
        Model: parentContract.Model,
        ChildModel: block.Model,
      })
      const deliveryConfig =
        generated === undefined
          ? normalized
          : {
              ...normalized,
              outgoingParentMessage: generated.envelope,
              fromParentMessage: generated.fromParentMessage,
              validateSelectedKey: generated.validateSelectedKey,
            }
      const binding = bindEach(
        block,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        deliveryConfig as never,
      )
      registerBindingParentContract(binding, parentContract)
      const storage = keyedMapBindingStorageOf(normalized)
      if (storage !== undefined) {
        registerBindingStorage(binding, storage)
      }
      if (generated !== undefined) {
        registerGeneratedDelivery(binding, generated.envelope)
      }
      return finishBinding(binding)
    }

    if (
      Predicate.isObject(config) &&
      Object.hasOwn(config, 'field') &&
      (Object.hasOwn(config, 'key') ||
        Object.hasOwn(config, 'childField') ||
        isKeyedFieldStorage(
          parentContract.Model,
          block.Model,
          Reflect.get(config, 'field'),
        ))
    ) {
      const generated = usesGeneratedDelivery(block.Message)
        ? generatedDelivery(block, parentContract.Model, config, true)
        : undefined
      const sourceConfig = generated?.config ?? config
      const placedConfig = Object.hasOwn(sourceConfig, 'placement')
        ? sourceConfig
        : { ...sourceConfig, placement: block.owner.id }
      const normalized = normalizeKeyedFieldConfig({
        ...placedConfig,
        Model: parentContract.Model,
        ChildModel: block.Model,
      })
      if (!Predicate.isObject(normalized)) {
        throw new Error(
          '[foldkit] A keyed field Binding must normalize to a configuration object.',
        )
      }
      const deliveryConfig =
        generated === undefined
          ? normalized
          : {
              ...normalized,
              outgoingParentMessage: generated.envelope,
              fromParentMessage: generated.fromParentMessage,
              validateSelectedKey: generated.validateSelectedKey,
            }
      const binding = bindEach(
        block,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        deliveryConfig as never,
      )
      registerBindingParentContract(binding, parentContract)
      if (generated !== undefined) {
        registerGeneratedDelivery(binding, generated.envelope)
      }
      const init = wrappedKeyedInitialPolicyOf(config, normalized)
      const storage = keyedOptionStorageOf(normalized)
      if (storage !== undefined) {
        registerBindingStorage(binding, storage)
      }
      if (init !== undefined) {
        registerBindingInitialPolicy(binding, init)
      }
      return finishBinding(binding)
    }

    if (!Predicate.isObject(config)) {
      throw new Error(
        '[foldkit] A Binding must normalize to a configuration object.',
      )
    }

    const generated = usesGeneratedDelivery(block.Message)
      ? generatedDelivery(block, parentContract.Model, config, false)
      : undefined
    const sourceConfig = generated?.config ?? config
    const normalized = Object.hasOwn(sourceConfig, 'field')
      ? normalizeConnectionConfig(
          { ...sourceConfig, Model: parentContract.Model },
          block.Model,
          block.Message,
          parentContract.Message,
        )
      : normalizeConnectionConfig(
          sourceConfig,
          block.Model,
          block.Message,
          parentContract.Message,
        )

    if (!Predicate.isObject(normalized)) {
      throw new Error(
        '[foldkit] A Binding must normalize to a configuration object.',
      )
    }
    const deliveryConfig =
      generated === undefined
        ? normalized
        : {
            ...normalized,
            outgoingParentMessage: generated.envelope,
            fromParentMessage: generated.fromParentMessage,
          }

    const binding = bind(
      block,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      deliveryConfig as never,
    )
    registerBindingParentContract(binding, parentContract)
    if (generated !== undefined) {
      registerGeneratedDelivery(binding, generated.envelope)
    }
    if (Object.hasOwn(config, 'field')) {
      registerDirectInitialPolicy(binding, block, parentContract.Model, config)
    } else {
      registerAccessorInitialPolicy(
        binding,
        block,
        parentContract.Model,
        config,
      )
    }
    return finishBinding(binding)
  }) as unknown as BindChild<
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema
  >
