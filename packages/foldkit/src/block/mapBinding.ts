import type { Schema } from 'effect'

import type { BindChild, BindChildConstructorResult } from './bindChild.js'
import type { BindableBlock, BindingStorageEvidence } from './binding.js'
import type { InstanceKey } from './instanceContext.js'
import type {
  KeyedMapField,
  KeyedMapKeySchemaAt,
} from './keyedMapFieldConnection.js'
import { asKeyedMapBindingConfig } from './keyedMapFieldConnection.js'
import type { ValidateConcreteComposition } from './requirements.js'

type AnySchema = Schema.Codec<any, any, any, any>

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnknown<Value> =
  IsAny<Value> extends true
    ? false
    : unknown extends Value
      ? [keyof Value] extends [never]
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

type MapBindingConfigKey =
  | 'field'
  | 'childField'
  | 'placement'
  | 'subscriptions'
  | 'delivery'

interface MapBindingConfigDocumentation {
  /** The exact required parent Struct field storing a Record or Effect HashMap. */
  field: unknown
  /** The required field containing the child Model in a closed parent-owned Struct value. */
  childField: unknown
  /** Stable Binding identity in the composition graph. Defaults to `field`. */
  placement: unknown
  /** Optional activation gates for child Subscription Streams. Map membership still controls occurrence presence. */
  subscriptions: unknown
  /** Selects update delivery context and optionally gates generated child Message delivery. */
  delivery: unknown
}

type KeySchemaFor<ParentModelSchema extends AnySchema, Field extends string> =
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>
    ? Field extends keyof ParentModelSchema['fields'] & string
      ? KeyedMapKeySchemaAt<ParentModelSchema, Field>
      : never
    : never

type KeyFor<
  ParentModelSchema extends AnySchema,
  Field extends string,
> = Extract<KeySchemaFor<ParentModelSchema, Field>['Type'], InstanceKey>

type SubscriptionsContext<
  BlockValue extends BindableBlock,
  ParentModel,
  Key,
> = Readonly<{
  /** Gates only Subscription Streams while this child occurrence is present. */
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

type DeliveryContext<BlockValue extends BindableBlock, ParentModel, Key> = [
  ChildUpdateContext<BlockValue>,
] extends [readonly []]
  ? Readonly<{
      /** Admits generated child Messages for update delivery. */
      when?: (model: ParentModel, key: Key) => boolean
      toUpdateContext?: never
    }>
  : Readonly<{
      /** Admits generated child Messages for update delivery. */
      when?: (model: ParentModel, key: Key) => boolean
      /** Maps the current parent Model and key to the child's update context. */
      toUpdateContext: (
        model: ParentModel,
        key: Key,
      ) => ChildUpdateContext<BlockValue>
    }>

type DeliveryRequirement<BlockValue extends BindableBlock, ParentModel, Key> = [
  ChildUpdateContext<BlockValue>,
] extends [readonly []]
  ? Readonly<{ delivery?: DeliveryContext<BlockValue, ParentModel, Key> }>
  : Readonly<{ delivery: DeliveryContext<BlockValue, ParentModel, Key> }>

type ContextualProperties<
  Keys extends MapBindingConfigKey,
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Field extends string,
  ChildField extends string,
> = {
  [Key in keyof Pick<MapBindingConfigDocumentation, Keys>]: Key extends 'field'
    ? Field
    : Key extends 'childField'
      ? ChildField
      : Key extends 'placement'
        ? string
        : Key extends 'subscriptions'
          ? SubscriptionsContext<
              BlockValue,
              ParentModelSchema['Type'],
              KeyFor<ParentModelSchema, Field>
            >
          : Key extends 'delivery'
            ? DeliveryContext<
                BlockValue,
                ParentModelSchema['Type'],
                KeyFor<ParentModelSchema, Field>
              >
            : unknown
}

type InvalidConfig<Reason> = readonly [
  error: Readonly<{ 'Map Binding config is invalid': Reason }>,
]

type ValidateKeys<Config> =
  Exclude<keyof Config, MapBindingConfigKey> extends never
    ? readonly []
    : InvalidConfig<
        Readonly<{
          'Map Binding config contains unsupported fields': Exclude<
            keyof Config,
            MapBindingConfigKey
          >
        }>
      >

type ValidField<
  BlockValue extends BindableBlock,
  ParentModelSchema extends AnySchema,
  Keys,
  ChildField extends string,
> = 'childField' extends Keys
  ? ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>
    ? KeyedMapField<ParentModelSchema, BlockValue['Model']['Type'], ChildField>
    : never
  : ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>
    ? KeyedMapField<ParentModelSchema, BlockValue['Model']['Type']>
    : never

type ValidateMessageMapping<BlockValue extends BindableBlock, Keys> = [
  BlockValue['Message']['Type'],
] extends [never]
  ? Extract<Keys, 'delivery'> extends never
    ? readonly []
    : InvalidConfig<'A Message-free child cannot configure Message delivery'>
  : readonly []

type ValidateConfig<BlockValue extends BindableBlock, Keys, Config> =
  IsAny<Config> extends true
    ? InvalidConfig<'Map Binding config cannot use any'>
    : IsUnknown<Config> extends true
      ? InvalidConfig<'Map Binding config cannot use unknown'>
      : true extends IsUnion<Config>
        ? InvalidConfig<'Map Binding config must be one concrete object type'>
        : ValidateKeys<Config> extends readonly []
          ? ValidateMessageMapping<BlockValue, Keys>
          : ValidateKeys<Config>

type ValidateConcrete<BlockValue extends BindableBlock> =
  unknown extends ValidateConcreteComposition<BlockValue>
    ? readonly []
    : readonly [error: ValidateConcreteComposition<BlockValue>]

type FieldOfSource<Source, Fallback extends string> =
  Source extends Readonly<{ field: infer Field extends string }>
    ? Field
    : Fallback

type ResultConfig<
  Source,
  ParentModelSchema extends AnySchema,
  Field extends string,
> = Readonly<{
  field: FieldOfSource<Source, Field>
  placement: Source extends Readonly<{
    placement: infer Placement extends string
  }>
    ? Placement
    : FieldOfSource<Source, Field>
  readAll: (model: ParentModelSchema['Type']) => ReadonlyArray<unknown>
  key: (
    item: unknown,
  ) => KeyFor<ParentModelSchema, FieldOfSource<Source, Field>>
  keySchema: KeySchemaFor<ParentModelSchema, FieldOfSource<Source, Field>>
}> &
  BindingStorageEvidence<
    Readonly<{
      kind: 'Map'
      field: FieldOfSource<Source, Field>
      childField: Source extends Readonly<{
        childField: infer ChildField extends string
      }>
        ? ChildField
        : never
    }>
  >

/** Call signature for `Definition.makeMapBinding`. See {@link Definition} for
 * the owned constructor's storage and initialization contract. */
export interface MakeMapBinding<
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
    ]
  ): BindChildConstructorResult<
    BlockValue,
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    ResultConfig<Source, ParentModelSchema, Field>,
    ParentChildInitContext
  >
}

/** @internal Creates a passive parent-owned map Binding constructor. */
export const makeMapBinding = <
  ParentModelSchema extends AnySchema,
  ParentMessageSchema extends AnySchema,
  ParentOutMessageSchema extends AnySchema | undefined,
  ParentChildInitContext = never,
>(
  makeBinding: BindChild<
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    ParentChildInitContext
  >,
): MakeMapBinding<
  ParentModelSchema,
  ParentMessageSchema,
  ParentOutMessageSchema,
  ParentChildInitContext
> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((block: BindableBlock, config: object): unknown => {
    return Reflect.apply(makeBinding, undefined, [
      block,
      asKeyedMapBindingConfig(config),
    ])
  }) as unknown as MakeMapBinding<
    ParentModelSchema,
    ParentMessageSchema,
    ParentOutMessageSchema,
    ParentChildInitContext
  >
