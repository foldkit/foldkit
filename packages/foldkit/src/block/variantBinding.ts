import { type Effect, Option, Predicate, Schema, SchemaAST } from 'effect'

import type {
  AnyDescriptor,
  BindingParent,
  YieldableBinding,
} from '../experimental/constructed/authoring.js'
import type {
  ConstructorEffectOf,
  CoreContract,
} from '../experimental/constructed/contract.js'
import type {
  BindChildConstructorResult,
  PlacementOfConfig,
} from './bindChild.js'
import type { BindableBlock, BindingStorageEvidence } from './binding.js'
import {
  type ConnectExecutable,
  bindingResolverOf,
} from './bindingConnection.js'
import { runtimeBindingOf } from './composition.js'
import type { Owner } from './owner.js'
import type { ValidateConcreteComposition } from './requirements.js'

type AnySchema = Schema.Codec<any, any, any, any>
type AnySelfContainedSchema = Schema.Codec<any, any, never, never>

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never

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

type IsSingleTag<Tag extends string> =
  IsAny<Tag> extends true
    ? false
    : [Tag] extends [never]
      ? false
      : true extends IsUnion<Tag>
        ? false
        : {} extends Record<Tag, unknown>
          ? false
          : true

type InvalidMember<Model> = Model extends unknown
  ? string extends keyof Model
    ? true
    : Model extends Readonly<{ _tag: infer Tag extends string }>
      ? IsSingleTag<Tag> extends true
        ? false
        : true
      : true
  : never

type DistinctTags<
  Members extends ReadonlyArray<Schema.Top>,
  Seen extends string = never,
> = Members extends readonly [
  infer First extends Schema.Top,
  ...infer Rest extends ReadonlyArray<Schema.Top>,
]
  ? First['Type'] extends Readonly<{ _tag: infer Tag extends string }>
    ? IsSingleTag<Tag> extends true
      ? Tag extends Seen
        ? false
        : DistinctTags<Rest, Seen | Tag>
      : false
    : false
  : Members extends readonly []
    ? true
    : false

type IsExactVariant<Parent, Child> =
  IsAny<Parent | Child> extends true
    ? false
    : [Parent] extends [never]
      ? false
      : [Child] extends [never]
        ? false
        : true extends InvalidMember<Parent | Child>
          ? false
          : [Child] extends [Readonly<{ _tag: infer Tag extends string }>]
            ? IsSingleTag<Tag> extends true
              ? Equal<Extract<Parent, Readonly<{ _tag: Tag }>>, Child>
              : false
            : false

type VariantDefinition = Readonly<{
  Model: AnySelfContainedSchema &
    Readonly<{ members: ReadonlyArray<Schema.Top> }>
  Message: AnySelfContainedSchema
  OutMessage?: AnySchema | undefined
  ChildInitContext?: AnySchema
}>

type OutMessageOf<Definition> =
  Definition extends Readonly<{
    OutMessage: infer OutMessage extends AnySchema
  }>
    ? OutMessage
    : undefined

type ChildInitContextOf<Definition> =
  Definition extends Readonly<{
    ChildInitContext: infer Context extends AnySchema
  }>
    ? Context['Type']
    : never

type UpdateContext<BlockValue extends BindableBlock> =
  Parameters<BlockValue['update']> extends readonly [
    unknown,
    unknown,
    ...infer Context,
  ]
    ? Context
    : readonly []

type Delivery<BlockValue extends BindableBlock, Parent> = [
  UpdateContext<BlockValue>,
] extends [readonly []]
  ? Readonly<{ when?: (model: Parent) => boolean; toUpdateContext?: never }>
  : Readonly<{
      when?: (model: Parent) => boolean
      toUpdateContext: (model: Parent) => UpdateContext<BlockValue>
    }>

type SubscriptionKeys<BlockValue extends BindableBlock> = {
  [
    Key in keyof BlockValue['subscriptions']
  ]: BlockValue['subscriptions'][Key] extends Readonly<{
    dependenciesToStream: unknown
  }>
    ? Key
    : never
}[keyof BlockValue['subscriptions']]

type Options<BlockValue extends BindableBlock, Parent> = Readonly<{
  placement?: string
  subscriptions?: Readonly<{
    when?:
      | ((model: Parent) => boolean)
      | Readonly<
          Partial<
            Record<SubscriptionKeys<BlockValue>, (model: Parent) => boolean>
          >
        >
  }>
}> &
  ([BlockValue['Message']['Type']] extends [never]
    ? Readonly<{ delivery?: never }>
    : [UpdateContext<BlockValue>] extends [readonly []]
      ? Readonly<{ delivery?: Delivery<BlockValue, Parent> }>
      : Readonly<{ delivery: Delivery<BlockValue, Parent> }>)

type Invalid<Reason> = readonly [
  error: Readonly<{
    'Variant Binding requires one exact tagged child Model member': Reason
  }>,
]

type Validate<
  Definition extends VariantDefinition,
  BlockValue extends BindableBlock,
> =
  DistinctTags<Definition['Model']['members']> extends true
    ? IsExactVariant<
        Definition['Model']['Type'],
        BlockValue['Model']['Type']
      > extends true
      ? unknown extends ValidateConcreteComposition<BlockValue>
        ? readonly []
        : readonly [error: ValidateConcreteComposition<BlockValue>]
      : Invalid<'The child Model must equal the complete parent variant selected by its one literal _tag'>
    : Invalid<'The parent must declare a finite tuple of distinct tagged Model Schemas'>

type ValidateSubscriptionKeys<
  Config,
  BlockValue extends BindableBlock,
  Parent,
> =
  Config extends Readonly<{ subscriptions: Readonly<{ when: infer Gates }> }>
    ? Gates extends (...args: ReadonlyArray<any>) => unknown
      ? Gates extends (model: Parent) => boolean
        ? readonly []
        : Invalid<'Subscription gates receive the whole parent Model and return boolean'>
      : Exclude<keyof Gates, SubscriptionKeys<BlockValue>> extends never
        ? readonly []
        : Invalid<'Subscription gates must name declared child Subscriptions'>
    : readonly []

type KeysOf<Value> = Value extends unknown ? keyof Value : never

type ValidateContainer<Value, Keys extends PropertyKey> =
  IsAny<Value> extends true
    ? Invalid<'Options must preserve a concrete object type'>
    : [Value] extends [object]
      ? [
          Extract<
            Value,
            ReadonlyArray<unknown> | ((...args: ReadonlyArray<any>) => unknown)
          >,
        ] extends [never]
        ? Exclude<KeysOf<Value>, Keys> extends never
          ? readonly []
          : Invalid<'Options contain unsupported properties'>
        : Invalid<'Options must be an object record'>
      : Invalid<'Options must be an object record'>

type ValidateNested<
  Config,
  Key extends PropertyKey,
  Keys extends PropertyKey,
> = Key extends keyof Config
  ? ValidateContainer<Exclude<Config[Key], undefined>, Keys>
  : readonly []

type ValidateOptions<Config, BlockValue extends BindableBlock, Parent> =
  IsAny<Config> extends true
    ? Invalid<'Options cannot be any'>
    : true extends IsUnion<Config>
      ? Invalid<'Options must be one concrete object type'>
      : readonly [
          ...ValidateContainer<
            Config,
            'placement' | 'subscriptions' | 'delivery'
          >,
          ...ValidateNested<Config, 'subscriptions', 'when'>,
          ...ValidateNested<Config, 'delivery', 'when' | 'toUpdateContext'>,
          ...ValidateSubscriptionKeys<Config, BlockValue, Parent>,
        ]

type VariantBinding<
  Definition extends VariantDefinition,
  BlockValue extends BindableBlock,
  Config,
> = BindChildConstructorResult<
  BlockValue,
  Definition['Model'],
  Definition['Message'],
  OutMessageOf<Definition>,
  Config & BindingStorageEvidence<Readonly<{ kind: 'Variant' }>>,
  ChildInitContextOf<Definition>
>

type ContractVariantDefinition = VariantDefinition &
  Readonly<{ owner: Owner<string> }>

type ChildContract = AnyDescriptor &
  Readonly<{
    layer?: never
    construct?: never
  }>

type ContractVariantBinding<
  Definition extends ContractVariantDefinition,
  Child extends ChildContract,
  Config,
> = BindChildConstructorResult<
  CoreContract<Child>,
  Definition['Model'],
  Definition['Message'],
  OutMessageOf<Definition>,
  Config & BindingStorageEvidence<Readonly<{ kind: 'Variant' }>>,
  ChildInitContextOf<Definition>,
  BindingParent<Definition['owner']> &
    Readonly<{
      connect: ConnectExecutable<
        CoreContract<Child>,
        PlacementOfConfig<CoreContract<Child>, Config>
      >
    }> &
    YieldableBinding<
      CoreContract<Child>,
      PlacementOfConfig<CoreContract<Child>, Config>,
      Effect.Error<ConstructorEffectOf<Child>>,
      Effect.Services<ConstructorEffectOf<Child>>
    >
>

/** @internal Names the bound whole-variant method in consumer declarations. */
export interface OwnedContractVariantBinding<
  Definition extends ContractVariantDefinition,
> {
  <const Child extends ChildContract>(
    child: Child,
    ...validation: readonly [
      ...Validate<Definition, CoreContract<Child>>,
      ...([UpdateContext<CoreContract<Child>>] extends [readonly []]
        ? readonly []
        : Invalid<'This child requires delivery.toUpdateContext'>),
    ]
  ): ContractVariantBinding<Definition, Child, Readonly<{}>>
  <const Child extends ChildContract, const Config extends object>(
    child: Child,
    config: Config & Options<CoreContract<Child>, Definition['Model']['Type']>,
    ...validation: readonly [
      ...Validate<Definition, CoreContract<Child>>,
      ...ValidateOptions<
        Config,
        CoreContract<Child>,
        Definition['Model']['Type']
      >,
    ]
  ): ContractVariantBinding<Definition, Child, Config>
}

/** @internal Names the native whole-variant method in consumer declarations. */
export interface OwnedNativeVariantBinding<
  Definition extends VariantDefinition,
> {
  <const Child extends BindableBlock>(
    child: Child,
    ...validation: readonly [
      ...Validate<Definition, Child>,
      ...([UpdateContext<Child>] extends [readonly []]
        ? readonly []
        : Invalid<'This child requires delivery.toUpdateContext'>),
    ]
  ): VariantBinding<Definition, Child, Readonly<{}>>
  <const Child extends BindableBlock, const Config extends object>(
    child: Child,
    config: Config & Options<Child, Definition['Model']['Type']>,
    ...validation: readonly [
      ...Validate<Definition, Child>,
      ...ValidateOptions<Config, Child, Definition['Model']['Type']>,
    ]
  ): VariantBinding<Definition, Child, Config>
}

/** Parent-owned whole-variant constructor for a completed native child. */
export type MakeNativeOwnedVariantBinding<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContext,
> = ModelSchema extends VariantDefinition['Model']
  ? MessageSchema extends AnySelfContainedSchema
    ? OwnedNativeVariantBinding<
        Readonly<{
          Model: ModelSchema
          Message: MessageSchema
          OutMessage: OutMessageSchema
          ChildInitContext: Schema.Schema<ChildInitContext>
        }>
      >
    : (child: never) => never
  : (child: never) => never

/** A parent-owned whole-variant constructor retaining exact child contracts. */
export type MakeOwnedVariantBinding<
  ModelSchema extends AnySelfContainedSchema,
  MessageSchema extends AnySelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  ParentOwner,
> =
  ModelSchema extends Readonly<{ members: ReadonlyArray<Schema.Top> }>
    ? OwnedContractVariantBinding<
        Readonly<{
          Model: ModelSchema
          Message: MessageSchema
          OutMessage: OutMessageSchema
          owner: Extract<ParentOwner, Owner<string>>
        }> &
          (ChildInitContextSchema extends AnySchema
            ? Readonly<{ ChildInitContext: ChildInitContextSchema }>
            : {})
      >
    : (child: never) => never

const tagOf = (ast: SchemaAST.AST): string | undefined => {
  if (!SchemaAST.isObjects(ast) || ast.indexSignatures.length !== 0) {
    return undefined
  }
  const property = ast.propertySignatures.find(
    property => property.name === '_tag',
  )
  if (property === undefined || SchemaAST.isOptional(property.type)) {
    return undefined
  }
  const tag = SchemaAST.toType(property.type)
  return SchemaAST.isLiteral(tag) && Predicate.isString(tag.literal)
    ? tag.literal
    : undefined
}

const variantTag = (parent: Schema.Top, child: Schema.Top): string => {
  const parentAst = SchemaAST.toType(parent.ast)
  const childAst = SchemaAST.toType(child.ast)
  const childTag = tagOf(childAst)
  if (!SchemaAST.isUnion(parentAst) || childTag === undefined) {
    throw new Error(
      '[foldkit] Variant Binding requires a union parent and a closed child Model with one literal _tag.',
    )
  }
  const tags = parentAst.types.map(tagOf)
  if (
    tags.some(tag => tag === undefined) ||
    new Set(tags).size !== tags.length
  ) {
    throw new Error(
      '[foldkit] Variant Binding requires distinct literal tags on closed parent variants.',
    )
  }
  const members = Reflect.get(parent, 'members')
  if (!globalThis.Array.isArray(members) || !members.includes(child)) {
    throw new Error(
      '[foldkit] Variant Binding parent Schema.Union must include the child Block.Model Schema itself.',
    )
  }
  return childTag
}

const assertOptionsRecord: (
  value: unknown,
  keys: ReadonlyArray<string> | undefined,
  label: string,
) => asserts value is object = (value, keys, label) => {
  if (
    !Predicate.isObject(value) ||
    globalThis.Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(
      `[foldkit] Variant Binding ${label} must be an object record.`,
    )
  }
  if (
    Reflect.ownKeys(value).some(
      key =>
        !Predicate.isString(key) || (keys !== undefined && !keys.includes(key)),
    )
  ) {
    throw new Error(
      `[foldkit] Variant Binding ${label} contains unsupported properties.`,
    )
  }
}

/** @internal Lowers a parent-owned exact whole-variant relationship. */
export const makeVariantBindingRuntime = (
  parentModel: unknown,
  lower: (child: object, config: object) => unknown,
  block: object,
  config: object = {},
): unknown => {
  assertOptionsRecord(
    config,
    ['placement', 'subscriptions', 'delivery'],
    'options',
  )
  const childModel = Reflect.get(block, 'Model')
  if (!Schema.isSchema(parentModel) || !Schema.isSchema(childModel)) {
    throw new Error(
      '[foldkit] makeVariantBinding requires a union parent Model and a child Block.',
    )
  }
  const subscriptions = Reflect.get(config, 'subscriptions')
  if (subscriptions !== undefined) {
    assertOptionsRecord(subscriptions, ['when'], 'subscriptions')
  }
  const delivery = Reflect.get(config, 'delivery')
  if (delivery !== undefined) {
    assertOptionsRecord(delivery, ['when', 'toUpdateContext'], 'delivery')
    for (const key of ['when', 'toUpdateContext']) {
      const value = Reflect.get(delivery, key)
      if (value !== undefined && !Predicate.isFunction(value)) {
        throw new Error(
          `[foldkit] Variant Binding delivery.${key} must be a function.`,
        )
      }
    }
  }
  const gates = Predicate.isObject(subscriptions)
    ? Reflect.get(subscriptions, 'when')
    : undefined
  if (gates !== undefined && !Predicate.isFunction(gates)) {
    assertOptionsRecord(
      gates,
      Reflect.get(block, 'subscriptions') === undefined
        ? undefined
        : Object.keys(Reflect.get(block, 'subscriptions')),
      'Subscription gates',
    )
    if (
      Reflect.ownKeys(gates).some(
        key => !Predicate.isFunction(Reflect.get(gates, key)),
      )
    ) {
      throw new Error(
        '[foldkit] Variant Binding Subscription gates must name declared child Subscriptions.',
      )
    }
  }
  const tag = variantTag(parentModel, childModel)
  const read = (model: object): Option.Option<unknown> =>
    Reflect.get(model, '_tag') === tag ? Option.some(model) : Option.none()
  const binding = lower(block, {
    ...config,
    read,
    write: (model: object, nextChild: unknown) =>
      Option.isSome(read(model)) ? nextChild : model,
  })
  if (!Predicate.isObject(binding)) {
    throw new Error(
      '[foldkit] makeVariantBinding requires a native child Binding.',
    )
  }
  if (bindingResolverOf(binding) === undefined) {
    runtimeBindingOf(binding)
  }
  return binding
}
