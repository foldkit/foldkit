import { Array, Option, Predicate, Schema, SchemaAST } from 'effect'

import type * as Update from '../update/index.js'
import { type BindableBlock, type Binding, bind } from './binding.js'
import {
  registerBindingInitialPolicy,
  registerBindingParentContract,
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
  isKeyedFieldStorage,
  normalizeKeyedFieldConfig,
  wrappedKeyedInitialPolicyOf,
} from './keyedFieldConnection.js'
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

type ParentMessageConstructor<
  ParentMessageSchema extends AnySchema,
  Key extends keyof ParentMessageSchema,
> = ParentMessageSchema[Key] extends Schema.Top &
  Readonly<{
    fields: Readonly<{ _tag: unknown }>
  }> &
  ((...args: ReadonlyArray<any>) => ParentMessageSchema['Type'])
  ? ParentMessageSchema[Key]
  : never

type ParentMessageConstructors<ParentMessageSchema extends AnySchema> = {
  [Key in keyof ParentMessageSchema]: ParentMessageConstructor<
    ParentMessageSchema,
    Key
  >
}[keyof ParentMessageSchema]

type ChildUpdateContext<BlockValue extends BindableBlock> =
  Parameters<BlockValue['update']> extends readonly [
    unknown,
    unknown,
    ...infer Context,
  ]
    ? Context
    : readonly []

type StaticFoldArguments<BlockValue extends BindableBlock> = readonly [
  message: BlockValue['Message']['Type'],
  ...context: ChildUpdateContext<BlockValue>,
]

type KeyedFoldArguments<
  BlockValue extends BindableBlock,
  Key extends InstanceKey,
> = readonly [
  key: Key,
  message: BlockValue['Message']['Type'],
  ...context: ChildUpdateContext<BlockValue>,
]

type FromParentArgs<ParentModel, ParentMessage, FoldArguments> = (
  model: ParentModel,
  message: ParentMessage,
) => Option.Option<FoldArguments>

type IncomingMessageOf<FromParentMessage, Mapper> =
  undefined extends FromParentMessage
    ? ReturnOf<Mapper>
    : FromParentMessage extends false
      ? never
      : FromParentMessage extends Readonly<{
            parentMessage: infer Constructor
          }>
        ? ReturnOf<Constructor>
        : ReturnOf<Mapper>

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

type ParentOwnedOutMessagePolicy<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  ParentOutMessageValue,
> =
  | Readonly<{
      fold: (
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
          forward: (
            outMessage: ChildOutMessage,
          ) => ParentOutMessageValue | undefined
          fold?: (
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

type ParentOwnedKeyedOutMessagePolicy<
  ParentModel,
  ChildMessage,
  ParentMessage,
  ChildOutMessage,
  ParentOutMessageValue,
  Key,
> =
  | Readonly<{
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
          forward: (
            key: Key,
            outMessage: ChildOutMessage,
          ) => ParentOutMessageValue | undefined
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

type DirectBindingReturn<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Mapper,
  Placement extends string,
  Policy,
  FromParentMessage,
> = Binding<
  BlockValue,
  ParentModelSchema['Type'],
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? ParentMessageSchema['Type']
    : ReturnOf<Mapper>,
  Placement,
  PolicyOf<BlockValue, Policy>,
  ParentModelSchema['Type'],
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? ParentMessageSchema['Type']
    : ReturnOf<Mapper>,
  ParentOutMessage<ParentOutMessageSchema>,
  ReturnOf<Mapper>,
  IncomingMessageOf<FromParentMessage, Mapper>,
  ParentMessageSchema
>

type AccessorBindingReturn<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Mapper,
  Placement extends string,
  Policy,
  FromParentMessage,
> = Binding<
  BlockValue,
  ParentModelSchema['Type'],
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? ParentMessageSchema['Type']
    : ReturnOf<Mapper>,
  Placement,
  PolicyOf<BlockValue, Policy>,
  ParentModelSchema['Type'],
  BlockValue extends Readonly<{
    OutMessage: Readonly<{ Type: unknown }>
  }>
    ? ParentMessageSchema['Type']
    : ReturnOf<Mapper>,
  ParentOutMessage<ParentOutMessageSchema>,
  ReturnOf<Mapper>,
  IncomingMessageOf<FromParentMessage, Mapper>,
  ParentMessageSchema
>

type ValidateCanonicalParentMessageConstructor<
  BlockValue extends BindableBlock,
  Mapper,
> = Mapper extends Schema.Constraint &
  Readonly<{
    fields: Readonly<{
      _tag: unknown
      message: Readonly<{ Type: infer Message }>
    }>
  }>
  ? Exclude<keyof Mapper['fields'], '_tag' | 'message'> extends never
    ? IsAny<Message> extends true
      ? never
      : [Message, BlockValue['Message']['Type']] extends [
            BlockValue['Message']['Type'],
            Message,
          ]
        ? unknown
        : never
    : never
  : never

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
        'Binding init model must always project the same parent Model field': ProjectedModel
      }>
    : [Exclude<keyof ProjectedModel, keyof ParentModel>] extends [never]
      ? unknown
      : Readonly<{
          'Binding init model must project exactly one declared parent Model field': Exclude<
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
  Startup,
> =
  Parameters<Resolver> extends readonly []
    ? never
    : Parameters<Resolver> extends readonly [infer Context]
      ? [Startup] extends [never]
        ? Context
        : Startup
      : never

type ValidateInitialResolver<
  Resolver extends (...args: ReadonlyArray<any>) => any,
> =
  IsAny<Resolver> extends true
    ? Readonly<{ 'Binding init args cannot use any': Resolver }>
    : IsAny<ReturnType<Resolver>> extends true
      ? Readonly<{
          'Binding init args return cannot use any': ReturnType<Resolver>
        }>
      : Equal<
            Resolver,
            (...args: Parameters<Resolver>) => ReturnType<Resolver>
          > extends false
        ? Readonly<{
            'Binding init args requires one concrete call signature': Resolver
          }>
        : Parameters<Resolver> extends readonly []
          ? unknown
          : Parameters<Resolver> extends readonly [infer Context]
            ? ValidateInitialContext<Context>
            : Readonly<{
                'Binding init args accepts zero or one context argument': Parameters<Resolver>
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
          'Optional Binding init args must return Option<InitArgs>': ReturnType<Resolver>
        }>
    : ReturnType<Resolver> extends ReadonlyArray<unknown>
      ? unknown
      : Readonly<{
          'Required Binding init args must return InitArgs': ReturnType<Resolver>
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
    import('./binding.js').BindingRequirement<Placement, BlockValue>
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
      args: infer Resolver extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? ValidateInitialResolver<Resolver> &
        ValidateInitialResolverStorage<ParentModel, Field, ChildModel, Resolver>
    : unknown)

type DirectBindingResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Mapper,
  Field extends keyof ParentModelSchema['Type'] & string,
  Placement extends string,
  Policy,
  Initial,
  FromParentMessage,
  Startup,
> = (
  Initial extends Readonly<{ init: false }>
    ? false
    : Initial extends Readonly<{
          init: true | Readonly<{ args: (...args: ReadonlyArray<any>) => any }>
        }>
      ? true
      : [Initial] extends [undefined]
        ? Equal<ParentModelSchema['Type'][Field], BlockValue['Model']['Type']>
        : false
) extends true
  ? InitializedBinding<
      DirectBindingReturn<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        Mapper,
        Placement,
        Policy,
        FromParentMessage
      >,
      BlockValue,
      ParentModelSchema['Type'],
      Field,
      Placement,
      Initial extends Readonly<{
        init: Readonly<{
          args: infer Resolver extends (...args: ReadonlyArray<any>) => any
        }>
      }>
        ? InitialResolverContext<Resolver, Startup>
        : never
    >
  : DirectBindingReturn<
      BlockValue,
      ParentModelSchema,
      ParentMessageSchema,
      ParentOutMessageSchema,
      Mapper,
      Placement,
      Policy,
      FromParentMessage
    >

type AccessorBindingResult<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Mapper,
  ProjectedModel,
  Placement extends string,
  Policy,
  Resolver extends (...args: ReadonlyArray<any>) => any,
  FromParentMessage,
  Startup,
> = InitializedBinding<
  AccessorBindingReturn<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Mapper,
    Placement,
    Policy,
    FromParentMessage
  >,
  BlockValue,
  ParentModelSchema['Type'],
  Extract<
    ProjectionField<ProjectedModel>,
    keyof ParentModelSchema['Type'] & string
  >,
  Placement,
  InitialResolverContext<Resolver, Startup>
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
  Startup,
> = InitializedBinding<
  BindingValue,
  BlockValue,
  ParentModel,
  Field,
  Placement,
  InitialResolverContext<Occurrences, Startup>
>

type CanonicalParentMessageConstructors<
  BlockValue extends BindableBlock,
  ParentMessageSchema extends AnySchema,
  Constructor = ParentMessageConstructors<ParentMessageSchema>,
> =
  Constructor extends ParentMessageConstructors<ParentMessageSchema>
    ? [
        ValidateCanonicalParentMessageConstructor<BlockValue, Constructor>,
      ] extends [never]
      ? never
      : Constructor
    : never

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

type MapperOfConfig<Config> =
  Config extends Readonly<{
    parentMessage: infer Mapper
  }>
    ? Mapper
    : Config extends Readonly<{ toParentMessage: infer Mapper }>
      ? Mapper
      : never

type PolicyOfConfig<Config> =
  Config extends Readonly<{
    outMessage: infer Policy
  }>
    ? Policy
    : never

type FromParentMessageOfConfig<Config> =
  Config extends Readonly<{
    fromParentMessage: infer FromParentMessage
  }>
    ? FromParentMessage
    : undefined

type InvalidBindChildConfig<Reason> = readonly [
  error: Readonly<{
    'Binding config is invalid': Reason
  }>,
]

type ValidateFromParentMessageKeys<Config> =
  Config extends Readonly<{ fromParentMessage: infer FromParentMessage }>
    ? FromParentMessage extends false
      ? readonly []
      : Exclude<keyof FromParentMessage, 'parentMessage' | 'args'> extends never
        ? readonly []
        : InvalidBindChildConfig<
            Readonly<{
              'fromParentMessage contains unsupported fields': Exclude<
                keyof FromParentMessage,
                'parentMessage' | 'args'
              >
            }>
          >
    : readonly []

type ValidateFromParentMessageConstructor<
  ParentMessageSchema extends AnySchema,
  Config,
> =
  Config extends Readonly<{
    fromParentMessage: Readonly<{ parentMessage: infer Constructor }>
  }>
    ? IsAny<Constructor> extends true
      ? InvalidBindChildConfig<'fromParentMessage.parentMessage cannot use any'>
      : IsUnknown<Constructor> extends true
        ? InvalidBindChildConfig<'fromParentMessage.parentMessage cannot use unknown'>
        : true extends IsUnion<Constructor>
          ? InvalidBindChildConfig<'fromParentMessage.parentMessage must be one exact constructor'>
          : true extends IsUnion<ReturnOf<Constructor>>
            ? InvalidBindChildConfig<'fromParentMessage.parentMessage must construct one exact variant'>
            : [Constructor] extends [
                  ParentMessageConstructors<ParentMessageSchema>,
                ]
              ? readonly []
              : InvalidBindChildConfig<'fromParentMessage.parentMessage must be a parent Message constructor'>
    : readonly []

type ValidateInitialKeys<Config> = 'init' extends keyof Config
  ? Config extends Readonly<{ init: infer Initial }>
    ? Initial extends boolean
      ? readonly []
      : Exclude<
            keyof Initial,
            'args' | 'model' | 'occurrences' | 'toItem'
          > extends never
        ? readonly []
        : InvalidBindChildConfig<
            Readonly<{
              'init contains unsupported fields': Exclude<
                keyof Initial,
                'args' | 'model' | 'occurrences' | 'toItem'
              >
            }>
          >
    : InvalidBindChildConfig<'Binding init must be one required, concrete policy'>
  : readonly []

type ValidateProjectedInitialModel<ParentModel, Config> =
  Config extends Readonly<{
    init: Readonly<{
      model: (...args: ReadonlyArray<any>) => infer ProjectedModel
    }>
  }>
    ? Exclude<keyof ProjectedModel, keyof ParentModel> extends never
      ? readonly []
      : InvalidBindChildConfig<
          Readonly<{
            'Binding init model contains undeclared parent Model fields': Exclude<
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
  ParentMessageSchema extends AnySchema,
  Config,
> =
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>
    ? Config extends Readonly<{
        field: infer Field extends keyof ParentModelSchema['Type'] & string
        key: infer KeyField extends string
        toParentMessage: infer Mapper
      }>
      ? Config extends Readonly<{ childField: infer ChildField extends string }>
        ? Config extends Pick<
            WrappedKeyedFieldConfig<
              BlockValue,
              ParentModelSchema,
              ParentMessageSchema['Type'],
              Mapper,
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
                ParentMessageSchema['Type'],
                Mapper,
                Field,
                KeyField,
                PlacementOfConfig<BlockValue, Config>
              >,
              'field' | 'key'
            >
            ? readonly []
            : InvalidBindChildConfig<'Invalid keyed field storage'>
          : InvalidBindChildConfig<'Invalid keyed field key'>
      : InvalidBindChildConfig<'Keyed field storage requires field, key, and toParentMessage'>
    : InvalidBindChildConfig<'Keyed field storage requires a parent Struct Model'>

type ValidateStaticStorage<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Keys,
  Field extends string,
  ParentMessageSchema extends AnySchema,
  KeyField extends string,
  ChildField extends string,
> = 'childField' extends Keys
  ? Extract<
      Keys,
      'readAll' | 'read' | 'write' | 'writeAt' | 'presentWhen' | 'parentMessage'
    > extends never
    ? ValidateKeyedFieldSource<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        Readonly<{
          field: Field
          key: KeyField
          childField: ChildField
          toParentMessage: (
            ...args: ReadonlyArray<any>
          ) => ParentMessageSchema['Type']
        }>
      >
    : InvalidBindChildConfig<'Wrapped keyed storage cannot include accessor or general keyed adapters'>
  : 'key' extends Keys
    ? Extract<
        Keys,
        | 'readAll'
        | 'read'
        | 'write'
        | 'writeAt'
        | 'presentWhen'
        | 'parentMessage'
      > extends never
      ? ValidateKeyedFieldSource<
          BlockValue,
          ParentModelSchema,
          ParentMessageSchema,
          Readonly<{
            field: Field
            key: KeyField
            toParentMessage: (
              ...args: ReadonlyArray<any>
            ) => ParentMessageSchema['Type']
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

type ValidateStaticMessageMapping<Keys> = 'parentMessage' extends Keys
  ? 'toParentMessage' extends Keys
    ? InvalidBindChildConfig<'Supply exactly one parent Message mapping'>
    : readonly []
  : 'toParentMessage' extends Keys
    ? readonly []
    : InvalidBindChildConfig<'A parent Message mapping is required'>

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
      occurrences: infer Occurrences extends (
        ...args: ReadonlyArray<any>
      ) => any
      toItem: infer ToItem extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? ValidationResult<
        ValidateInitialResolver<Occurrences> & ValidateWrappedToItem<ToItem>
      >
    : Config extends Readonly<{ key: unknown; init: unknown }>
      ? InvalidBindChildConfig<'Keyed child initialization requires an occurrences policy'>
      : Config extends Readonly<{
            field: infer Field extends keyof ParentModel & string
            init: unknown
          }>
        ? Config['init'] extends true
          ? Equal<ParentModel[Field], BlockValue['Model']['Type']> extends true
            ? [] extends Parameters<BlockValue['init']>
              ? readonly []
              : InvalidBindChildConfig<'A child requiring init arguments needs init.args or init: false'>
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
                args: infer Resolver extends (
                  ...args: ReadonlyArray<any>
                ) => any
                model: (...args: ReadonlyArray<any>) => infer ProjectedModel
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
                  : InvalidBindChildConfig<'A child requiring init arguments needs init.args or init: false'>
                : readonly []
              : readonly []

type ValidateOutMessagePolicyPresence<BlockValue extends BindableBlock, Keys> =
  BlockValue extends Readonly<{ OutMessage: Readonly<{ Type: unknown }> }>
    ? 'outMessage' extends Keys
      ? readonly []
      : InvalidBindChildConfig<'A child declaring OutMessage requires an outMessage policy'>
    : readonly []

type RequiredOutMessagePolicy<BlockValue extends BindableBlock> =
  BlockValue extends Readonly<{ OutMessage: Readonly<{ Type: unknown }> }>
    ? Readonly<{ outMessage: unknown }>
    : unknown

type ValidateStaticBindChildSource<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  Keys,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
  Config,
> =
  Config extends Readonly<{ parentMessage: infer Constructor }>
    ? IsAny<Constructor> extends true
      ? InvalidBindChildConfig<'parentMessage cannot use any'>
      : IsUnknown<Constructor> extends true
        ? InvalidBindChildConfig<'parentMessage cannot use unknown'>
        : true extends IsUnion<Constructor>
          ? InvalidBindChildConfig<'parentMessage must be one exact constructor'>
          : [Constructor] extends [
                CanonicalParentMessageConstructors<
                  BlockValue,
                  ParentMessageSchema
                >,
              ]
            ? ValidateStaticBindingConfig<
                BlockValue,
                ParentModelSchema,
                ParentMessageSchema,
                Keys,
                Field,
                KeyField,
                ChildField,
                Config
              >
            : InvalidBindChildConfig<'parentMessage must be an exact canonical parent Message constructor'>
    : ValidateStaticBindingConfig<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        Keys,
        Field,
        KeyField,
        ChildField,
        Config
      >

type ValidateStaticBindingConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  Keys,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
  Config,
> =
  ValidateOutMessagePolicyPresence<BlockValue, Keys> extends readonly []
    ? IsAny<Config> extends true
      ? InvalidBindChildConfig<'Binding config cannot use any'>
      : IsUnknown<Config> extends true
        ? InvalidBindChildConfig<'Binding config cannot use unknown'>
        : true extends IsUnion<Config>
          ? InvalidBindChildConfig<'Binding config must be one concrete object type'>
          : ValidateBindChildConfigKeys<Config> extends readonly []
            ? ValidateFromParentMessageKeys<Config> extends readonly []
              ? ValidateFromParentMessageConstructor<
                  ParentMessageSchema,
                  Config
                > extends readonly []
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
                        ParentMessageSchema,
                        KeyField,
                        ChildField
                      > extends readonly []
                      ? ValidateStaticMessageMapping<Keys> extends readonly []
                        ? ValidateStaticInitialPolicy<
                            BlockValue,
                            ParentModelSchema['Type'],
                            Config
                          >
                        : ValidateStaticMessageMapping<Keys>
                      : ValidateStaticStorage<
                          BlockValue,
                          ParentModelSchema,
                          Keys,
                          Field,
                          ParentMessageSchema,
                          KeyField,
                          ChildField
                        >
                    : ValidateProjectedInitialModel<
                        ParentModelSchema['Type'],
                        Config
                      >
                  : ValidateInitialKeys<Config>
                : ValidateFromParentMessageConstructor<
                    ParentMessageSchema,
                    Config
                  >
              : ValidateFromParentMessageKeys<Config>
            : ValidateBindChildConfigKeys<Config>
    : ValidateOutMessagePolicyPresence<BlockValue, Keys>

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
  ? { call(...args: Parameters<Callback>): any }['call']
  : Callback

type ContextualOutMessagePolicy<Policy> = Policy extends unknown
  ? { [Key in keyof Policy]: ContextualPolicyFunction<Policy[Key]> }
  : never

type PolicyFunctionDomain<Callback> = Callback extends (
  ...args: infer Arguments
) => any
  ? (...args: Arguments) => any
  : Callback

type PolicyDomains<Policy> = Policy extends unknown
  ? { [Key in keyof Policy]: PolicyFunctionDomain<Policy[Key]> }
  : never

type ValidateOutMessagePolicyDomain<Config, Context> =
  Config extends Readonly<{ outMessage: infer Policy }>
    ? PolicyDomains<Policy> extends PolicyDomains<Context>
      ? readonly []
      : InvalidBindChildConfig<'OutMessage policy must accept every child OutMessage and collection key'>
    : readonly []

type ValidateGeneralKeyedPolicy<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  KeyValue extends InstanceKey,
  Config,
> =
  Config extends Readonly<{ outMessage: infer Policy }>
    ? PolicyDomains<Policy> extends PolicyDomains<
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
      ? readonly []
      : InvalidBindChildConfig<'OutMessage policy must accept every child OutMessage and collection key'>
    : readonly []

type ValidateGeneralKeyedSource<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  KeyValue extends InstanceKey,
  Keys,
  Config,
> =
  ValidateOutMessagePolicyPresence<BlockValue, Keys> extends readonly []
    ? ValidateFromParentMessageConstructor<
        ParentMessageSchema,
        Config
      > extends readonly []
      ? ValidateBindChildConfigKeys<Config> extends readonly []
        ? ValidateGeneralKeyedPolicy<
            BlockValue,
            ParentModelSchema,
            ParentMessageSchema,
            ParentOutMessageSchema,
            KeyValue,
            Config
          >
        : ValidateBindChildConfigKeys<Config>
      : ValidateFromParentMessageConstructor<ParentMessageSchema, Config>
    : ValidateOutMessagePolicyPresence<BlockValue, Keys>

type GeneralKeyedConfigKey =
  | 'placement'
  | 'readAll'
  | 'key'
  | 'read'
  | 'writeAt'
  | 'toParentMessage'
  | 'fromParentMessage'
  | 'outMessage'
  | 'subscriptions'

type GeneralKeyedContextualProperties<
  Keys extends GeneralKeyedConfigKey,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Constructor,
  ReadAll,
  KeyOf extends object,
> = {
  [
    Key in keyof Pick<BindChildConfigDocumentation, Keys>
  ]?: Key extends 'readAll'
    ? ReadAll
    : Key extends 'key'
      ? unknown
      : Key extends 'read'
        ? (item: ItemOfReadAll<NoInfer<ReadAll>>) => BlockValue['Model']['Type']
        : Key extends 'writeAt'
          ? (
              model: ParentModelSchema['Type'],
              key: Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>,
              nextChildModel: BlockValue['Model']['Type'],
            ) => ParentModelSchema['Type']
          : Key extends 'toParentMessage'
            ? (
                key: Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>,
                message: BlockValue['Message']['Type'],
              ) => ParentMessageSchema['Type']
            : Key extends 'fromParentMessage'
              ?
                  | false
                  | Readonly<{
                      parentMessage: Constructor
                      /** Returns Some of the native fold arguments, or None to ignore this wrapper. */
                      args: FromParentArgs<
                        ParentModelSchema['Type'],
                        ReturnOf<NoInfer<Constructor>>,
                        KeyedFoldArguments<
                          BlockValue,
                          Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>
                        >
                      >
                    }>
              : Key extends 'outMessage'
                ? ContextualOutMessagePolicy<
                    KeyedOutMessageContext<
                      'readAll',
                      BlockValue,
                      ParentModelSchema,
                      ParentMessageSchema,
                      ParentOutMessageSchema,
                      Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>,
                      never,
                      never
                    >
                  >
                : Key extends 'subscriptions'
                  ? KeyedSubscriptionsContext<
                      BlockValue,
                      ParentModelSchema['Type'],
                      Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>
                    >
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
  /** Stable Binding identity within this parent, independent of DOM placement. Defaults to field for field storage, otherwise the child Block ID. */
  placement: unknown
  /** Makes a direct-field child absent while false, including updates and lifecycle effects. Distinct from the Subscription-only gate. */
  presentWhen: unknown
  /** Canonical parent constructor accepting exactly { message }. Use either this or toParentMessage. */
  parentMessage: unknown
  /** Maps each emitted child Message to its parent wrapper, with the originating key for keyed children. */
  toParentMessage: unknown
  /** Routes one parent wrapper to the native fold. Its args returns Some of the exact fold tuple or None to ignore. False keeps routing manual. A canonical unkeyed Binding may omit this only when the child update declares no context parameters; optional and defaulted context still require this policy. */
  fromParentMessage: unknown
  /** Folds or forwards every child OutMessage. Composition checks returned Steps and their registered sibling requirements. */
  outMessage: unknown
  /** Optional activation gates that affect only child Subscriptions while the child is present. */
  subscriptions: unknown
  /** Declares startup inputs or opts out with false. A required direct field initializes without arguments by default. Optional and keyed children need explicit presence/occurrence policies for automatic startup. Selectors run on initializer invocation; handlers execute later in the Runtime. */
  init: unknown
}

type CoreConfigKey =
  | 'placement'
  | 'presentWhen'
  | 'parentMessage'
  | 'toParentMessage'
  | 'fromParentMessage'
  | 'outMessage'
  | 'subscriptions'

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

type InitialContext<
  Keys,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Field extends string,
  KeyField extends string,
  InitialArguments extends ReadonlyArray<unknown>,
  Startup,
> =
  | ('field' extends Keys ? ('key' extends Keys ? never : false) : never)
  | ([] extends Parameters<BlockValue['init']>
      ? true & Readonly<{ args?: never }>
      : never)
  | Readonly<{
      /** Selects the exact child init tuple; an Option selector may leave direct optional storage absent. */
      args: (
        ...context: [Startup] extends [never]
          ? ReadonlyArray<any>
          : [startup: Startup]
      ) =>
        | Readonly<Parameters<BlockValue['init']>>
        | Option.Option<Readonly<Parameters<BlockValue['init']>>>
      model?: never
      occurrences?: never
      toItem?: never
    }>
  | Readonly<{
      /** Selects the exact child init tuple; an Option selector may leave direct optional storage absent. */
      args: (
        ...context: [Startup] extends [never]
          ? ReadonlyArray<any>
          : [startup: Startup]
      ) => Readonly<Parameters<BlockValue['init']>>
      /** Projects the initialized child into exactly one declared parent storage field. */
      model: (
        childModel: BlockValue['Model']['Type'],
      ) => AccessorInitialProjection<
        ParentModelSchema['Type'],
        BlockValue['Model']['Type']
      >
      occurrences?: never
      toItem?: never
    }>
  | Readonly<{
      /** Selects initial keyed occurrences in their Command collection order. */
      occurrences: (
        ...context: [Startup] extends [never]
          ? ReadonlyArray<any>
          : [startup: Startup]
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
      args?: never
      model?: never
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
  Mapper,
  Constructor,
  InitialArguments extends ReadonlyArray<unknown>,
  Startup,
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
          Startup
        >
      : Key extends 'placement'
        ? string
        : Key extends 'parentMessage'
          ? Mapper &
              Schema.Top &
              ((
                value: Readonly<{
                  message: BlockValue['Message']['Type']
                }>,
              ) => ParentMessageSchema['Type'])
          : Key extends 'toParentMessage'
            ? 'readAll' extends Keys
              ? (
                  key: NoInfer<KeyValue>,
                  message: BlockValue['Message']['Type'],
                ) => ParentMessageSchema['Type']
              : 'key' extends Keys
                ? (
                    key: KeyForConfig<
                      Keys,
                      BlockValue,
                      ParentModelSchema,
                      KeyValue,
                      Field,
                      KeyField
                    >,
                    message: BlockValue['Message']['Type'],
                  ) => ParentMessageSchema['Type']
                : (
                    message: BlockValue['Message']['Type'],
                  ) => ParentMessageSchema['Type']
            : Key extends 'fromParentMessage'
              ? 'readAll' extends Keys
                ?
                    | false
                    | Readonly<{
                        parentMessage: Constructor
                        /** Returns Some of the native fold arguments, or None to ignore this wrapper. */
                        args: FromParentArgs<
                          ParentModelSchema['Type'],
                          ReturnOf<NoInfer<Constructor>>,
                          KeyedFoldArguments<BlockValue, NoInfer<KeyValue>>
                        >
                      }>
                : 'key' extends Keys
                  ?
                      | false
                      | Readonly<{
                          parentMessage: Constructor
                          /** Returns Some of the native fold arguments, or None to ignore this wrapper. */
                          args: FromParentArgs<
                            ParentModelSchema['Type'],
                            ReturnOf<NoInfer<Constructor>>,
                            KeyedFoldArguments<
                              BlockValue,
                              KeyForConfig<
                                Keys,
                                BlockValue,
                                ParentModelSchema,
                                KeyValue,
                                Field,
                                KeyField
                              >
                            >
                          >
                        }>
                  :
                      | false
                      | Readonly<{
                          parentMessage?: Constructor
                          /** Returns Some of the native fold arguments, or None to ignore this wrapper. */
                          args: FromParentArgs<
                            ParentModelSchema['Type'],
                            ReturnOf<NoInfer<Constructor>>,
                            StaticFoldArguments<BlockValue>
                          >
                        }>
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
                      : unknown
}

type DefaultPlacementOfConfig<BlockValue extends BindableBlock, Config> =
  Config extends Readonly<{ field: infer Field extends string }>
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
      args: infer Resolver extends (...args: ReadonlyArray<any>) => any
    }>
  }>
    ? Resolver
    : never

type ProjectedModelOfConfig<Config> =
  Config extends Readonly<{
    init: Readonly<{
      model: (...args: ReadonlyArray<any>) => infer ProjectedModel
    }>
  }>
    ? ProjectedModel
    : never

type OccurrencesOfConfig<Config> =
  Config extends Readonly<{
    init: Readonly<{
      occurrences: infer Occurrences extends (
        ...args: ReadonlyArray<any>
      ) => any
    }>
  }>
    ? Occurrences
    : never

type KeyedBindingResultForConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  Key extends InstanceKey,
> = KeyedBinding<
  BlockValue,
  ParentModelSchema['Type'],
  ParentMessageSchema['Type'],
  Key,
  PlacementOfConfig<BlockValue, Config>,
  PolicyOf<BlockValue, PolicyOfConfig<Config>>,
  ParentModelSchema['Type'],
  ParentMessageSchema['Type'],
  ParentOutMessage<ParentOutMessageSchema>,
  ReturnOf<MapperOfConfig<Config>>,
  IncomingMessageOf<FromParentMessageOfConfig<Config>, MapperOfConfig<Config>>
>

type BindChildResultForConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  Config,
  Startup,
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
            occurrences: (...args: ReadonlyArray<any>) => any
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
            OccurrencesOfConfig<Config>,
            Startup
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
              occurrences: (...args: ReadonlyArray<any>) => any
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
              OccurrencesOfConfig<Config>,
              Startup
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
          ? DirectBindingResult<
              BlockValue,
              ParentModelSchema,
              ParentMessageSchema,
              ParentOutMessageSchema,
              MapperOfConfig<Config>,
              Field,
              PlacementOfConfig<BlockValue, Config>,
              PolicyOfConfig<Config>,
              InitialOfConfig<Config>,
              FromParentMessageOfConfig<Config>,
              Startup
            >
          : Config extends Readonly<{
                init: Readonly<{
                  model: (...args: ReadonlyArray<any>) => any
                }>
              }>
            ? AccessorBindingResult<
                BlockValue,
                ParentModelSchema,
                ParentMessageSchema,
                ParentOutMessageSchema,
                MapperOfConfig<Config>,
                ProjectedModelOfConfig<Config>,
                PlacementOfConfig<BlockValue, Config>,
                PolicyOfConfig<Config>,
                ResolverOfConfig<Config>,
                FromParentMessageOfConfig<Config>,
                Startup
              >
            : AccessorBindingReturn<
                BlockValue,
                ParentModelSchema,
                ParentMessageSchema,
                ParentOutMessageSchema,
                MapperOfConfig<Config>,
                PlacementOfConfig<BlockValue, Config>,
                PolicyOfConfig<Config>,
                FromParentMessageOfConfig<Config>
              >

/** Creates a static, optional, or keyed child Binding in this Definition's
 * parent Model, Message, and OutMessage context.
 *
 * Register the returned Binding in the same Definition's Composition. A
 * Binding created by another Definition is rejected even when its structural
 * Model and Message types happen to match. Its Composition validates policy
 * outputs and the sibling Bindings used by those policies. Creating the Binding
 * records passive composition policy; a Runtime starts its lifecycle work later. */
export interface BindChild<
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined = undefined,
  Startup = never,
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
    const Mapper extends (...args: ReadonlyArray<any>) => any,
    const Source extends object,
    const InitialArguments extends Parameters<BlockValue['init']> = Parameters<
      BlockValue['init']
    >,
    const Constructor extends (...args: ReadonlyArray<any>) => any = Mapper,
  >(
    block: BlockValue,
    config: Source &
      RequiredOutMessagePolicy<BlockValue> &
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
        Mapper,
        Constructor,
        InitialArguments,
        Startup
      > &
      Readonly<{
        readAll?: never
        key?: KeyField
        field?: Field
        childField?: ChildField
        parentMessage?: Mapper
        writeAt?: never
      }> &
      (
        | Readonly<{ fromParentMessage: false }>
        | Readonly<{
            parentMessage: Mapper
            fromParentMessage: Readonly<{
              parentMessage?: Constructor
            }>
          }>
        | Readonly<{
            toParentMessage: unknown
            fromParentMessage: Readonly<{
              parentMessage: Constructor
            }>
          }>
        | ([ChildUpdateContext<BlockValue>] extends [readonly []]
            ? Readonly<{
                key?: never
                parentMessage: Mapper
                fromParentMessage?: never
              }>
            : never)
      ),
    ...validation: readonly [
      ...ValidateStaticBindChildSource<
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        NoInfer<Keys>,
        NoInfer<Field>,
        NoInfer<KeyField>,
        NoInfer<ChildField>,
        NoInfer<Source>
      >,
      ...ValidateOutMessagePolicyDomain<
        NoInfer<Source>,
        'key' extends NoInfer<Keys>
          ? KeyedOutMessageContext<
              NoInfer<Keys>,
              BlockValue,
              ParentModelSchema,
              ParentMessageSchema,
              ParentOutMessageSchema,
              NoInfer<KeyValue>,
              NoInfer<Field>,
              NoInfer<KeyField>
            >
          : StaticOutMessageContext<
              BlockValue,
              ParentModelSchema,
              ParentMessageSchema,
              ParentOutMessageSchema
            >
      >,
    ]
  ): BindChildResultForConfig<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Source,
    Startup
  >
  <
    const BlockValue extends BindableBlock,
    const Keys extends GeneralKeyedConfigKey,
    const ReadAll extends (
      model: ParentModelSchema['Type'],
    ) => ReadonlyArray<unknown>,
    const KeyOf extends object,
    const Constructor extends (...args: ReadonlyArray<any>) => any,
    const Source extends object = object,
  >(
    block: BlockValue,
    config: Source &
      RequiredOutMessagePolicy<BlockValue> &
      GeneralKeyedContextualProperties<
        Keys,
        BlockValue,
        ParentModelSchema,
        ParentMessageSchema,
        ParentOutMessageSchema,
        Constructor,
        ReadAll,
        KeyOf
      > &
      Readonly<{
        readAll: ReadAll
        key: KeyOf & ((item: ItemOfReadAll<NoInfer<ReadAll>>) => InstanceKey)
        read: (
          item: ItemOfReadAll<NoInfer<ReadAll>>,
        ) => BlockValue['Model']['Type']
        writeAt: (
          model: ParentModelSchema['Type'],
          key: Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>,
          nextChildModel: BlockValue['Model']['Type'],
        ) => ParentModelSchema['Type']
        toParentMessage: (
          key: Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>,
          message: BlockValue['Message']['Type'],
        ) => ParentMessageSchema['Type']
        fromParentMessage:
          | false
          | Readonly<{
              parentMessage: Constructor
              /** Returns Some of the native fold arguments, or None to ignore this wrapper. */
              args: FromParentArgs<
                ParentModelSchema['Type'],
                ReturnOf<NoInfer<Constructor>>,
                KeyedFoldArguments<
                  BlockValue,
                  Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>
                >
              >
            }>
        field?: never
        childField?: never
        parentMessage?: never
        presentWhen?: never
        init?: never
        write?: never
      }>,
    ...validation: ValidateGeneralKeyedSource<
      BlockValue,
      ParentModelSchema,
      ParentMessageSchema,
      ParentOutMessageSchema,
      Extract<ReturnOf<NoInfer<KeyOf>>, InstanceKey>,
      NoInfer<Keys>,
      NoInfer<Source>
    >
  ): KeyedBinding<
    BlockValue,
    ParentModelSchema['Type'],
    ParentMessageSchema['Type'],
    Extract<ReturnOf<KeyOf>, InstanceKey>,
    PlacementOfConfig<BlockValue, Source>,
    PolicyOf<BlockValue, PolicyOfConfig<Source>>,
    ParentModelSchema['Type'],
    ParentMessageSchema['Type'],
    ParentOutMessage<ParentOutMessageSchema>,
    ReturnOf<MapperOfConfig<Source>>,
    IncomingMessageOf<FromParentMessageOfConfig<Source>, MapperOfConfig<Source>>
  >
}

const assertGeneralKeyedConfig = (config: object): void => {
  const allowedFields = new Set([
    'placement',
    'readAll',
    'key',
    'read',
    'writeAt',
    'toParentMessage',
    'subscriptions',
    'outMessage',
    'field',
    'childField',
    'presentWhen',
    'parentMessage',
    'fromParentMessage',
  ])
  for (const configField of Reflect.ownKeys(config)) {
    if (!Predicate.isString(configField) || !allowedFields.has(configField)) {
      throw new Error(
        `[foldkit] A general keyed Binding does not support the config field "${globalThis.String(configField)}".`,
      )
    }
  }

  for (const forbiddenField of [
    'field',
    'childField',
    'presentWhen',
    'parentMessage',
  ]) {
    if (Object.hasOwn(config, forbiddenField)) {
      throw new Error(
        forbiddenField === 'childField'
          ? '[foldkit] A general keyed Binding cannot supply childField.'
          : '[foldkit] A general keyed Binding cannot supply field, presentWhen, or parentMessage.',
      )
    }
  }

  for (const functionField of [
    'readAll',
    'key',
    'read',
    'writeAt',
    'toParentMessage',
  ]) {
    if (!Predicate.isFunction(Reflect.get(config, functionField))) {
      throw new Error(
        `[foldkit] A general keyed Binding requires a ${functionField} function.`,
      )
    }
  }
}

type RuntimeMessageConstructor = Schema.Top &
  ((...args: ReadonlyArray<any>) => Readonly<{ _tag: string }>)

const isRuntimeMessageConstructor = (
  value: unknown,
): value is RuntimeMessageConstructor =>
  Predicate.isFunction(value) && Schema.isSchema(value)

const isParentMessageMember = (
  parentSchema: Schema.Top,
  constructor: Schema.Top,
): boolean => {
  const visited = new Set<SchemaAST.AST>()
  const visit = (ast: SchemaAST.AST): boolean => {
    if (visited.has(ast)) {
      return false
    }

    visited.add(ast)

    if (SchemaAST.isSuspend(ast)) {
      return visit(SchemaAST.toType(ast.thunk()))
    }

    if (SchemaAST.isUnion(ast)) {
      return ast.types.some(visit)
    }

    return hasSameDecodedSchemaShape(Schema.make<Schema.Top>(ast), constructor)
  }

  return visit(SchemaAST.toType(parentSchema.ast))
}

const normalizeFromParentMessage = (
  block: BindableBlock,
  parentMessageSchema: Schema.Top,
  config: object,
  isKeyed: boolean,
): Readonly<{
  outgoingParentMessage?: RuntimeMessageConstructor
  fromParentMessage: RuntimeFromParentMessage
}> => {
  const canonicalParentMessage = Reflect.get(config, 'parentMessage')
  const hasCanonicalParentMessage = Object.hasOwn(config, 'parentMessage')

  if (
    hasCanonicalParentMessage &&
    !isRuntimeMessageConstructor(canonicalParentMessage)
  ) {
    throw new Error(
      '[foldkit] parentMessage must be a callable Message Schema constructor.',
    )
  }

  const outgoingParentMessage = isRuntimeMessageConstructor(
    canonicalParentMessage,
  )
    ? canonicalParentMessage
    : undefined
  const hasPolicy = Object.hasOwn(config, 'fromParentMessage')
  const policy = Reflect.get(config, 'fromParentMessage')

  if (!hasPolicy) {
    if (
      !isKeyed &&
      isRuntimeMessageConstructor(canonicalParentMessage) &&
      !hasObservableUpdateContext(block.update)
    ) {
      return {
        outgoingParentMessage: canonicalParentMessage,
        fromParentMessage: {
          parentMessage: canonicalParentMessage,
          args: (_model, message) =>
            Option.some([Reflect.get(message, 'message')]),
        },
      }
    }

    throw new Error(
      '[foldkit] A custom, keyed, or contextual Binding must supply fromParentMessage as false or an object with parentMessage and args.',
    )
  }

  if (policy === false) {
    return {
      ...(outgoingParentMessage === undefined ? {} : { outgoingParentMessage }),
      fromParentMessage: false,
    }
  }

  if (!Predicate.isObject(policy)) {
    throw new Error(
      '[foldkit] fromParentMessage must be false or an object with parentMessage and args.',
    )
  }

  for (const field of Reflect.ownKeys(policy)) {
    if (field !== 'parentMessage' && field !== 'args') {
      throw new Error(
        `[foldkit] fromParentMessage does not support the field "${globalThis.String(field)}".`,
      )
    }
  }

  const parentMessage = Object.hasOwn(policy, 'parentMessage')
    ? Reflect.get(policy, 'parentMessage')
    : canonicalParentMessage
  const args = Reflect.get(policy, 'args')
  if (
    !isRuntimeMessageConstructor(parentMessage) ||
    !isParentMessageMember(parentMessageSchema, parentMessage)
  ) {
    throw new Error(
      '[foldkit] fromParentMessage.parentMessage must be an exact variant constructor declared by the parent Message Schema.',
    )
  }
  if (!Predicate.isFunction(args)) {
    throw new Error(
      '[foldkit] fromParentMessage.args must be a function returning an Option of fold arguments.',
    )
  }

  return {
    ...(outgoingParentMessage === undefined ? {} : { outgoingParentMessage }),
    fromParentMessage: {
      parentMessage,
      args: (model, message) =>
        Reflect.apply(args, undefined, [model, message]),
    },
  }
}

const withDeliveryConfig = (
  block: BindableBlock,
  parentMessageSchema: Schema.Top,
  config: object,
  normalized: object,
  isKeyed: boolean,
): object => ({
  ...normalized,
  ...normalizeFromParentMessage(block, parentMessageSchema, config, isKeyed),
})

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
      `[foldkit] Direct Binding field "${field}" init must be false, true, or an object with an args function.`,
    )
  }

  if (init === true && isOptional) {
    throw new Error(
      `[foldkit] Direct optional Binding field "${field}" requires an explicit init.args presence policy.`,
    )
  }

  const argumentResolver = init === true ? () => [] : Reflect.get(init, 'args')
  if (!Predicate.isFunction(argumentResolver)) {
    throw new Error(
      `[foldkit] Direct Binding field "${field}" init must be false, true, or an object with an args function.`,
    )
  }

  if (Predicate.isObject(init)) {
    for (const policyField of Reflect.ownKeys(init)) {
      if (policyField !== 'args') {
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
            `[foldkit] Direct optional Binding field "${field}" init.args must return an Option of child init arguments.`,
          )
        }
        if (Option.isNone(result)) {
          return Option.none()
        }
        if (!globalThis.Array.isArray(result.value)) {
          throw new Error(
            `[foldkit] Direct optional Binding field "${field}" init.args must contain a child init argument tuple.`,
          )
        }
        return Option.some(result.value)
      }

      if (!globalThis.Array.isArray(result)) {
        throw new Error(
          `[foldkit] Direct Binding field "${field}" init.args must return a child init argument tuple.`,
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
      '[foldkit] An accessor Binding init policy must be an object with args and model functions.',
    )
  }

  for (const policyField of Reflect.ownKeys(init)) {
    if (policyField !== 'args' && policyField !== 'model') {
      throw new Error(
        `[foldkit] An accessor Binding init policy does not support the field "${globalThis.String(policyField)}".`,
      )
    }
  }

  const argumentResolver = Reflect.get(init, 'args')
  const projectModel = Reflect.get(init, 'model')
  if (
    !Predicate.isFunction(argumentResolver) ||
    !Predicate.isFunction(projectModel)
  ) {
    throw new Error(
      '[foldkit] An accessor Binding init policy must supply args and model functions.',
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
      '[foldkit] An accessor Binding init model requires a required parent Struct field whose decoded type exactly matches the child Model.',
    )
  }

  registerBindingInitialPolicy(binding, {
    kind: 'Projected',
    allowedFields,
    resolveArguments: context => {
      const result = Reflect.apply(argumentResolver, undefined, [context])
      if (!globalThis.Array.isArray(result)) {
        throw new Error(
          '[foldkit] An accessor Binding init.args function must return a child init argument tuple.',
        )
      }
      return result
    },
    project: childModel => {
      const projection = Reflect.apply(projectModel, undefined, [childModel])
      if (!Predicate.isObject(projection)) {
        throw new Error(
          '[foldkit] An accessor Binding init.model function must return an object containing exactly one parent Model field.',
        )
      }

      const projectedFields = Reflect.ownKeys(projection)
      if (projectedFields.length !== 1) {
        throw new Error(
          '[foldkit] An accessor Binding init.model function must return exactly one parent Model field.',
        )
      }

      const field = Option.getOrThrow(Array.head(projectedFields))
      if (!Predicate.isString(field) || !allowedFields.includes(field)) {
        throw new Error(
          `[foldkit] Accessor Binding init.model field "${globalThis.String(field)}" must be a required parent Struct field whose decoded type exactly matches the child Model.`,
        )
      }

      const value = Reflect.get(projection, field)
      if (!Object.is(value, childModel)) {
        throw new Error(
          `[foldkit] Accessor Binding init.model field "${field}" must contain the initialized child Model it receives.`,
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

const assertOutMessagePolicy = (
  block: BindableBlock,
  parentOutMessage: AnySchema | undefined,
  config: unknown,
): void => {
  if (!Predicate.isObject(config)) {
    throw new Error(
      '[foldkit] A child Binding requires a configuration object.',
    )
  }

  const isOutMessageDeclared = Schema.isSchema(Reflect.get(block, 'OutMessage'))
  const isPolicySupplied = Object.hasOwn(config, 'outMessage')

  if (!isOutMessageDeclared) {
    if (isPolicySupplied) {
      throw new Error(
        '[foldkit] A child Block without OutMessage cannot supply an outMessage policy.',
      )
    }
    return
  }

  const policy = Reflect.get(config, 'outMessage')
  if (!Predicate.isObject(policy)) {
    throw new Error(
      '[foldkit] A child Block declaring OutMessage requires an outMessage policy with a fold or forward function.',
    )
  }

  const isFoldSupplied = 'fold' in policy
  const isForwardSupplied = 'forward' in policy
  if (!isFoldSupplied && !isForwardSupplied) {
    throw new Error(
      '[foldkit] An OutMessage policy requires a fold or forward function.',
    )
  }

  if (isFoldSupplied && !Predicate.isFunction(Reflect.get(policy, 'fold'))) {
    throw new Error('[foldkit] Binding outMessage.fold must be a function.')
  }

  if (
    isForwardSupplied &&
    !Predicate.isFunction(Reflect.get(policy, 'forward'))
  ) {
    throw new Error('[foldkit] Binding outMessage.forward must be a function.')
  }

  if (isForwardSupplied && parentOutMessage === undefined) {
    throw new Error(
      '[foldkit] Binding outMessage.forward requires an OutMessage Schema on the parent Definition.',
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
    Startup?: AnySchema | undefined
  }>,
): BindChild<ParentModelSchema, ParentMessageSchema, ParentOutMessageSchema> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((block: BindableBlock, config: unknown): unknown => {
    assertOutMessagePolicy(block, parentContract.OutMessage, config)

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
      const deliveryConfig = withDeliveryConfig(
        block,
        parentContract.Message,
        config,
        config,
        true,
      )

      const binding = bindEach(
        block,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        deliveryConfig as never,
      )
      registerBindingParentContract(binding, parentContract)
      return Object.freeze(binding)
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
      const normalized = normalizeKeyedFieldConfig({
        ...config,
        Model: parentContract.Model,
        ChildModel: block.Model,
      })
      if (!Predicate.isObject(normalized)) {
        throw new Error(
          '[foldkit] A keyed field Binding must normalize to a configuration object.',
        )
      }
      const deliveryConfig = withDeliveryConfig(
        block,
        parentContract.Message,
        config,
        normalized,
        true,
      )
      const binding = bindEach(
        block,
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        deliveryConfig as never,
      )
      registerBindingParentContract(binding, parentContract)
      const init = wrappedKeyedInitialPolicyOf(config, normalized)
      if (init !== undefined) {
        registerBindingInitialPolicy(binding, init)
      }
      return Object.freeze(binding)
    }

    const normalized =
      Predicate.isObject(config) && Object.hasOwn(config, 'field')
        ? normalizeConnectionConfig(
            { ...config, Model: parentContract.Model },
            block.Model,
            block.Message,
            parentContract.Message,
          )
        : normalizeConnectionConfig(
            config,
            block.Model,
            block.Message,
            parentContract.Message,
          )

    if (!Predicate.isObject(config) || !Predicate.isObject(normalized)) {
      throw new Error(
        '[foldkit] A Binding must normalize to a configuration object.',
      )
    }
    const deliveryConfig = withDeliveryConfig(
      block,
      parentContract.Message,
      config,
      normalized,
      false,
    )

    const binding = bind(
      block,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      deliveryConfig as never,
    )
    registerBindingParentContract(binding, parentContract)
    if (Predicate.isObject(config) && Object.hasOwn(config, 'field')) {
      registerDirectInitialPolicy(binding, block, parentContract.Model, config)
    } else if (Predicate.isObject(config)) {
      registerAccessorInitialPolicy(
        binding,
        block,
        parentContract.Model,
        config,
      )
    }
    return Object.freeze(binding)
  }) as BindChild<
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema
  >
