import { Predicate, Schema } from 'effect'

import type { BindChild, BindChildConstructorResult } from './bindChild.js'
import type { BindableBlock } from './binding.js'
import { runtimeBindingOf } from './composition.js'
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

type MapBindingDefinition = Readonly<{
  Model: AnySchema
  Message: AnySchema
  OutMessage?: AnySchema
  ChildInitContext?: AnySchema
}>

type OutMessageSchemaOfDefinition<DefinitionValue> =
  DefinitionValue extends Readonly<{
    OutMessage: infer OutMessageSchema extends AnySchema
  }>
    ? OutMessageSchema
    : undefined

type ChildInitContextOfDefinition<DefinitionValue> =
  DefinitionValue extends Readonly<{
    ChildInitContext: infer ChildInitContextSchema extends AnySchema
  }>
    ? ChildInitContextSchema['Type']
    : never

type BindChildOfDefinition<DefinitionValue extends MapBindingDefinition> =
  BindChild<
    DefinitionValue['Model'],
    DefinitionValue['Message'],
    OutMessageSchemaOfDefinition<DefinitionValue>,
    ChildInitContextOfDefinition<DefinitionValue>
  >

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
}>

/** Creates a keyed child Binding over an exact required Record or Effect
 * HashMap field owned by the supplied parent Definition.
 *
 * Add `childField` when each map value is a closed parent-owned Struct wrapping
 * the exact child Model. Placement defaults to `field`. Map membership controls
 * occurrence presence, while `subscriptions` gates only Subscription Streams.
 * Explicit insertion remains parent-owned through the returned Binding's
 * `init` operation. This dedicated subpath keeps its Schema-derived generic
 * surface isolated from ordinary Binding type checking. */
export interface MakeMapBinding {
  <
    const DefinitionValue extends MapBindingDefinition,
    const BlockValue extends BindableBlock,
    const Keys extends MapBindingConfigKey,
    const Field extends string,
    const ChildField extends string,
    const Source extends object,
  >(
    definition: DefinitionValue &
      Readonly<{ makeBinding: BindChildOfDefinition<DefinitionValue> }>,
    block: BlockValue,
    config: Source &
      Readonly<{ outMessage?: never }> &
      ContextualProperties<
        Keys,
        BlockValue,
        DefinitionValue['Model'],
        Field,
        ChildField
      > &
      Readonly<{
        field: Field &
          ValidField<BlockValue, DefinitionValue['Model'], Keys, ChildField>
        childField?: ChildField
      }> &
      ([BlockValue['Message']['Type']] extends [never]
        ? Readonly<{ delivery?: never }>
        : DeliveryRequirement<
            BlockValue,
            DefinitionValue['Model']['Type'],
            KeyFor<DefinitionValue['Model'], Field>
          >),
    ...validation: readonly [
      ...ValidateConfig<BlockValue, NoInfer<Keys>, NoInfer<Source>>,
      ...ValidateConcrete<BlockValue>,
    ]
  ): BindChildConstructorResult<
    BlockValue,
    DefinitionValue['Model'],
    DefinitionValue['Message'],
    OutMessageSchemaOfDefinition<DefinitionValue>,
    ResultConfig<Source, DefinitionValue['Model'], Field>,
    ChildInitContextOfDefinition<DefinitionValue>
  >
}

/** Creates a keyed child Binding from a parent Definition's required Record or
 * Effect HashMap field. */
export const makeMapBinding = ((): MakeMapBinding =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  ((definition: object, block: BindableBlock, config: object): unknown => {
    const makeBinding = Reflect.get(definition, 'makeBinding')
    if (!Predicate.isFunction(makeBinding)) {
      throw new Error(
        '[foldkit] makeMapBinding requires a parent Definition with makeBinding.',
      )
    }

    const binding = Reflect.apply(makeBinding, definition, [
      block,
      asKeyedMapBindingConfig(config),
    ])
    if (!Predicate.isObject(binding)) {
      throw new Error(
        '[foldkit] makeMapBinding requires a parent Definition whose makeBinding method returns a native child Binding.',
      )
    }

    try {
      runtimeBindingOf(binding)
    } catch {
      throw new Error(
        '[foldkit] makeMapBinding requires a parent Definition whose makeBinding method returns a native child Binding.',
      )
    }

    return binding
  }) as unknown as MakeMapBinding)()
