import type { Schema } from 'effect'

import type {
  BindChildConfigKey,
  BindChildConstructorResult,
  BindChildContextualProperties,
  GeneralKeyedConfigKey,
  GeneralKeyedContextualProperties,
  GeneratedDeliveryRequirement,
  ItemOfReadAll,
  KeyForConfig,
  PlacementOfConfig,
  ValidateConcreteCompositionArguments,
  ValidateGeneralKeyedSourceWithoutPolicy,
  ValidateStaticBindingConfigWithoutPolicy,
} from '../../block/bindChild.js'
import type { BindableBlock } from '../../block/binding.js'
import type { ConnectExecutable } from '../../block/bindingConnection.js'
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
export interface ConnectableBindChild<
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
