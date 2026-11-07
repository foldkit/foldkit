import type { Schema } from 'effect'

import type {
  BindChildConfigKey,
  BindChildConstructorResult,
  BindChildContextualProperties,
  DirectKeyedInitialBindingConfig,
  GeneralKeyedConfigKey,
  GeneralKeyedContextualProperties,
  GeneratedDeliveryRequirement,
  ItemOfReadAll,
  KeyForConfig,
  PlacementOfConfig,
  ValidateConcreteCompositionArguments,
  ValidateDirectKeyedInitialBindingConfig,
  ValidateGeneralKeyedSourceWithoutPolicy,
  ValidateStaticBindingConfigWithoutPolicy,
} from '../../block/bindChild.js'
import type { BindableBlock } from '../../block/binding.js'
import type { NativeRelationshipConstructors } from '../../block/bindingAuthoring.js'
import type { ConnectExecutable } from '../../block/bindingConnection.js'
import type {
  FieldRelationship,
  MapRelationship,
  MapRelationshipField,
  RelationshipStorageFields,
} from '../../block/bindingRelationshipTypes.js'
import type { InstanceKey } from '../../block/instanceContext.js'
import type {
  ContextualProperties,
  DeliveryRequirement,
  KeyFor,
  MapBindingConfigKey,
  MapBindingResultConfig,
  ValidField,
  ValidateConcrete,
  ValidateConfig,
} from '../../block/mapBinding.js'

type AnySchema = Schema.Codec<any, any, any, any>

/** @internal Exposes executable connection only on experimental child Binding results. */
export interface ConnectableFieldChild<
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined = undefined,
  ChildInitContext = never,
  Relationship extends FieldRelationship = 'Required',
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
      RelationshipStorageFields<Relationship, Field, KeyField, ChildField> &
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
      (Relationship extends 'Implicit'
        ? Readonly<{
            readAll?: never
            key?: KeyField
            field?: Field
            childField?: ChildField
            writeAt?: never
          }>
        : unknown) &
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
        NoInfer<Source>,
        Relationship
      >,
      ...ValidateConcreteCompositionArguments<BlockValue>,
      ...('connect' extends keyof BlockValue['operations']
        ? readonly [reservedConnectionOperation: never]
        : readonly []),
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Source,
    ChildInitContext,
    Readonly<{
      connect: ConnectExecutable<
        BlockValue,
        PlacementOfConfig<BlockValue, Source>
      >
    }>
  >
  <
    const BlockValue extends BindableBlock,
    const Field extends keyof ParentModelSchema['Type'] & string,
    const KeyField extends string,
    const Config extends DirectKeyedInitialBindingConfig<
      BlockValue,
      ParentModelSchema,
      Field,
      KeyField,
      Parameters<BlockValue['init']>,
      ChildInitContext
    >,
  >(
    block: BlockValue,
    config: Relationship extends 'KeyedArray'
      ? Config & Readonly<{ field: Field; key: KeyField }>
      : never,
    ...validation: readonly [
      ...ValidateDirectKeyedInitialBindingConfig<
        BlockValue,
        ParentModelSchema,
        NoInfer<Field>,
        NoInfer<KeyField>,
        Parameters<BlockValue['init']>,
        ChildInitContext,
        NoInfer<Config>
      >,
      ...ValidateConcreteCompositionArguments<BlockValue>,
      ...('connect' extends keyof BlockValue['operations']
        ? readonly [reservedConnectionOperation: never]
        : readonly []),
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Config,
    ChildInitContext,
    Readonly<{
      connect: ConnectExecutable<
        BlockValue,
        PlacementOfConfig<BlockValue, Config>
      >
    }>
  >
}

/** @internal Connectable keyed accessor contract for the construction experiment. */
export interface ConnectableCustomKeyedChild<
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined = undefined,
  ChildInitContext = never,
> {
  <
    const BlockValue extends BindableBlock,
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
        activeWhen?: never
        init?: never
        write?: never
      }> &
      ([BlockValue['Message']['Type']] extends [never]
        ? Readonly<{
            delivery?: never
            keySchema?: never
          }>
        : Readonly<{
            keySchema: Schema.Top & Schema.Schema<NoInfer<KeyValue>>
          }> &
            GeneratedDeliveryRequirement<
              BlockValue,
              ParentModelSchema['Type'],
              KeyValue
            >),
    ...validation: readonly [
      ...ValidateGeneralKeyedSourceWithoutPolicy<NoInfer<Source>>,
      ...ValidateConcreteCompositionArguments<BlockValue>,
      ...('connect' extends keyof BlockValue['operations']
        ? readonly [reservedConnectionOperation: never]
        : readonly []),
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    Source,
    ChildInitContext,
    Readonly<{
      connect: ConnectExecutable<
        BlockValue,
        PlacementOfConfig<BlockValue, Source>
      >
    }>
  >
}

/** @internal Exposes executable connection only on experimental map Binding results. */
export interface ConnectableMapBinding<
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  ParentChildInitContext = never,
  Relationship extends MapRelationship = 'Record',
> {
  <
    const BlockValue extends BindableBlock,
    const Keys extends MapBindingConfigKey,
    const Field extends string,
    const ChildField extends string,
    const Source extends object,
  >(
    block: BlockValue,
    config: Source &
      Readonly<{ outMessage?: never }> &
      ContextualProperties<
        Keys,
        BlockValue,
        ParentModelSchema,
        Field,
        ChildField
      > &
      Readonly<{
        field: Field &
          MapRelationshipField<ParentModelSchema, Relationship, Field> &
          ValidField<BlockValue, ParentModelSchema, Keys, ChildField>
        childField?: ChildField
      }> &
      ([BlockValue['Message']['Type']] extends [never]
        ? Readonly<{ delivery?: never }>
        : DeliveryRequirement<
            BlockValue,
            ParentModelSchema['Type'],
            KeyFor<ParentModelSchema, Field>
          >),
    ...validation: readonly [
      ...ValidateConfig<BlockValue, NoInfer<Keys>, NoInfer<Source>>,
      ...ValidateConcrete<BlockValue>,
      ...('connect' extends keyof BlockValue['operations']
        ? readonly [reservedConnectionOperation: never]
        : readonly []),
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    MapBindingResultConfig<Source, ParentModelSchema, Field>,
    ParentChildInitContext,
    Readonly<{
      connect: ConnectExecutable<
        BlockValue,
        MapBindingResultConfig<Source, ParentModelSchema, Field>['placement']
      >
    }>
  >
}

/** @internal Keeps complete Binding expressions portable in the construction experiment. */
export interface ConnectableRelationshipConstructors<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContext,
> extends Pick<
  NativeRelationshipConstructors<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext
  >,
  'makeVariantBinding'
> {
  readonly makeRequiredFieldBinding: ConnectableFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'Required'
  >
  readonly makeOptionalFieldBinding: ConnectableFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'Optional'
  >
  readonly makeOptionalKeyedFieldBinding: ConnectableFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'OptionalKeyed'
  >
  readonly makeKeyedArrayBinding: ConnectableFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'KeyedArray'
  >
  readonly makeCustomBinding: ConnectableFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'Custom'
  >
  readonly makeRecordBinding: ConnectableMapBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'Record'
  >
  readonly makeHashMapBinding: ConnectableMapBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'HashMap'
  >
  readonly makeCustomKeyedBinding: ConnectableCustomKeyedChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext
  >
}
