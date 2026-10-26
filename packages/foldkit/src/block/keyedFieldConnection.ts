import { Array, Option, Predicate, Schema, SchemaAST } from 'effect'

import { modifyFields } from '../struct/index.js'
import type { BindableBlock } from './binding.js'
import type {
  RuntimeBindingStorage,
  RuntimeWrappedKeyedInitialOccurrence,
  RuntimeWrappedKeyedInitialPolicy,
} from './composition.js'
import { hasSameDecodedSchemaShape } from './decodedSchemaShape.js'
import type { InstanceKey } from './instanceContext.js'
import type { KeyedBindingBaseConfig } from './keyedBinding.js'
import type { ValidateConcreteComposition } from './requirements.js'

const initializationStorage = new WeakMap<object, RuntimeBindingStorage>()

/** @internal Reads validated optional-slot storage from a lowered field config. */
export const keyedOptionStorageOf = (
  config: object,
): RuntimeBindingStorage | undefined => initializationStorage.get(config)

type Exact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

type Equal<Left, Right> = [Left, Right] extends [Right, Left]
  ? Left extends ReadonlyArray<infer LeftItem>
    ? Right extends ReadonlyArray<infer RightItem>
      ? Exact<LeftItem, RightItem>
      : false
    : Exact<Left, Right>
  : false

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsNever<Value> = [Value] extends [never] ? true : false

type ReturnOf<Value> = Value extends (
  ...args: ReadonlyArray<never>
) => infer Output
  ? Output
  : never

/** @internal Required fields whose value exactly matches a declared Model. */
export type RequiredExactField<Model, Value> = Extract<
  {
    [Field in keyof Model]-?: {} extends Pick<Model, Field>
      ? never
      : IsAny<Model[Field]> extends true
        ? never
        : Equal<Model[Field], Value> extends true
          ? Field
          : never
  }[keyof Model],
  string
>

/** @internal Required Struct fields whose exact value is the child Model array. */
export type RequiredKeyedField<Model, ChildModel> = RequiredExactField<
  Model,
  ReadonlyArray<ChildModel>
>

/** @internal The wrapper Model stored by a parent keyed field. */
export type WrappedItemAt<Model, Field extends keyof Model> =
  Model[Field] extends ReadonlyArray<infer Item>
    ? Item
    : Model[Field] extends Option.Option<infer Item>
      ? Item
      : never

type IsUnion<Value, Whole = Value> = Value extends Whole
  ? [Whole] extends [Value]
    ? false
    : true
  : never

type SingularField<Field extends string> =
  IsUnion<Field> extends true ? never : string extends Field ? never : Field

type WrappedStorageSchema<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field,
> = Field extends keyof ParentModelSchema['fields']
  ? ParentModelSchema['fields'][Field] extends Schema.$Array<infer ItemSchema>
    ? ItemSchema extends Schema.Struct<Schema.Struct.Fields>
      ? ParentModelSchema['fields'][Field]
      : never
    : ParentModelSchema['fields'][Field] extends Schema.Option<infer ItemSchema>
      ? ItemSchema extends Schema.Struct<Schema.Struct.Fields>
        ? ParentModelSchema['fields'][Field]
        : never
      : never
  : never

type ValidateWrappedStorageField<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field extends keyof ParentModelSchema['Type'],
> = [WrappedStorageSchema<ParentModelSchema, Field>] extends [never]
  ? never
  : {} extends Pick<ParentModelSchema['Type'], Field>
    ? never
    : IsAny<ParentModelSchema['Type'][Field]> extends true
      ? never
      : unknown

/** @internal Required child Model fields whose values are valid occurrence keys. */
export type RequiredKeyField<ChildModel> =
  IsAny<ChildModel> extends true
    ? never
    : ChildModel extends ReadonlyArray<unknown>
      ? never
      : ChildModel extends object
        ? Extract<
            {
              [Field in keyof ChildModel]-?: {} extends Pick<ChildModel, Field>
                ? never
                : IsAny<ChildModel[Field]> extends true
                  ? never
                  : IsNever<ChildModel[Field]> extends true
                    ? never
                    : [ChildModel[Field]] extends [InstanceKey]
                      ? Field
                      : never
            }[keyof ChildModel],
            string
          >
        : never

type ValidateRequiredKeyField<
  Model,
  Field extends string,
> = Field extends keyof Model
  ? {} extends Pick<Model, Field>
    ? never
    : IsAny<Model[Field]> extends true
      ? never
      : IsNever<Model[Field]> extends true
        ? never
        : [Model[Field]] extends [InstanceKey]
          ? unknown
          : never
  : never

type ValidateRequiredExactField<
  Model,
  Field extends string,
  Value,
> = Field extends keyof Model
  ? {} extends Pick<Model, Field>
    ? never
    : IsAny<Model[Field]> extends true
      ? never
      : Equal<Model[Field], Value> extends true
        ? unknown
        : never
  : never

/** @internal The exact occurrence key stored by a child Model field. */
export type KeyAt<
  ChildModel,
  KeyField extends string,
> = KeyField extends keyof ChildModel
  ? Extract<ChildModel[KeyField], InstanceKey>
  : never

type ValidateParentMessageMapping<Mapper, ParentMessage> =
  IsAny<ReturnOf<Mapper>> extends true
    ? never
    : unknown extends ReturnOf<Mapper>
      ? never
      : [ReturnOf<Mapper>] extends [ParentMessage]
        ? unknown
        : never

/** @internal Narrow adapter config for a Struct child Model array stored directly in a parent Struct field. */
export type KeyedFieldConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  ParentMessage,
  Mapper,
  Field extends keyof ParentModelSchema['Type'] & string,
  KeyField extends keyof BlockValue['Model']['Type'] & string,
  Placement extends string,
> = Omit<
  KeyedBindingBaseConfig<
    BlockValue,
    ParentModelSchema['Type'],
    ReturnOf<Mapper>,
    BlockValue['Model']['Type'],
    KeyAt<BlockValue['Model']['Type'], KeyField>,
    Placement
  >,
  'placement' | 'readAll' | 'key' | 'read' | 'writeAt' | 'toParentMessage'
> &
  Readonly<{
    /** Selects the required parent Struct field whose exact value is the child
     * Model array. */
    field: Field &
      RequiredKeyedField<ParentModelSchema['Type'], BlockValue['Model']['Type']>
    Model?: never
    ChildModel?: never
    /** Selects the stable child Model identity. Init and update results must
     * preserve the supplied key; the parent owns collection membership. */
    key: KeyField & RequiredKeyField<BlockValue['Model']['Type']>
    /** Identifies this Binding within the parent's composition graph. It
     * defaults to the child Block ID. */
    placement?: Placement
    /** Maps a child Message with the originating occurrence key into the parent
     * Message type. */
    toParentMessage: Mapper &
      ((
        key: KeyAt<BlockValue['Model']['Type'], KeyField>,
        message: BlockValue['Message']['Type'],
      ) => unknown)
    childField?: never
    parentMessage?: never
    presentWhen?: never
    readAll?: never
    read?: never
    write?: never
    writeAt?: never
  }> &
  ValidateParentMessageMapping<Mapper, ParentMessage> &
  ValidateConcreteComposition<BlockValue> &
  (BlockValue['Model'] extends Readonly<{ fields: Schema.Struct.Fields }>
    ? unknown
    : never)

/** @internal Narrow adapter for closed Struct wrappers containing one exact decoded child Model. */
export type WrappedKeyedFieldConfig<
  BlockValue extends BindableBlock,
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  ParentMessage,
  Mapper,
  Field extends keyof ParentModelSchema['Type'] & string,
  KeyField extends string,
  ChildField extends string,
  Placement extends string,
> = Readonly<{
  /** Selects the required parent Struct field containing a declared array or
   * Option of closed Struct wrappers. */
  field: SingularField<Field> &
    ValidateWrappedStorageField<ParentModelSchema, Field>
  /** Selects the required stable string or finite-number key on each wrapper. The
   * parent owns that identity; it remains outside the child Model. */
  key: SingularField<KeyField> &
    ValidateRequiredKeyField<
      WrappedItemAt<ParentModelSchema['Type'], Field>,
      KeyField
    >
  /** Selects the required wrapper field whose Schema has exactly the same
   * decoded shape as the child Model. Writes replace only this field in an
   * existing matching wrapper, preserving its key and other fields. Array
   * storage also preserves collection order. It must differ from key. */
  childField: SingularField<ChildField> &
    ValidateRequiredExactField<
      WrappedItemAt<ParentModelSchema['Type'], Field>,
      ChildField,
      BlockValue['Model']['Type']
    > &
    Exclude<ChildField, KeyField>
  /** Identifies this occurrence within its parent's graph; defaults to the
   * child Block ID. */
  placement?: Placement
  /** Gates child Subscriptions without disabling updates or other occurrence
   * lifecycle work. Unspecified named Subscriptions remain enabled. */
  subscriptions?: Readonly<{
    /** Enables every child Subscription with one predicate, or selected named
     * Subscriptions with a partial record. */
    when?:
      | ((
          model: ParentModelSchema['Type'],
          key: KeyAt<WrappedItemAt<ParentModelSchema['Type'], Field>, KeyField>,
        ) => boolean)
      | Readonly<
          Partial<
            globalThis.Record<
              keyof BlockValue['subscriptions'],
              (
                model: ParentModelSchema['Type'],
                key: KeyAt<
                  WrappedItemAt<ParentModelSchema['Type'], Field>,
                  KeyField
                >,
              ) => boolean
            >
          >
        >
  }>
  /** Maps a child Message and the originating wrapper key into the parent
   * Message type. Keyed mappings remain explicit. */
  toParentMessage: Mapper &
    ((
      key: KeyAt<WrappedItemAt<ParentModelSchema['Type'], Field>, KeyField>,
      message: BlockValue['Message']['Type'],
    ) => unknown)
  Model?: never
  ChildModel?: never
  parentMessage?: never
  presentWhen?: never
  readAll?: never
  read?: never
  write?: never
  writeAt?: never
}> &
  ValidateParentMessageMapping<Mapper, ParentMessage> &
  ValidateConcreteComposition<BlockValue>

const fieldsOf = (schema: unknown): unknown =>
  Schema.isSchema(schema) ? Reflect.get(schema, 'fields') : undefined

/** @internal Whether a parent Struct field is the exact child Model array storage shape. */
export const isKeyedFieldStorage = (
  parentModel: unknown,
  childModel: unknown,
  field: unknown,
): boolean => {
  const parentFields = fieldsOf(parentModel)
  if (
    !Predicate.isString(field) ||
    !Predicate.isObject(parentFields) ||
    !Object.hasOwn(parentFields, field)
  ) {
    return false
  }

  const fieldSchema = Reflect.get(parentFields, field)
  return (
    Schema.isSchema(fieldSchema) &&
    Schema.isSchema(childModel) &&
    hasSameDecodedSchemaShape(fieldSchema, Schema.Array(childModel))
  )
}

const isOptionalField = (fieldSchema: unknown): boolean => {
  if (!Predicate.isObjectKeyword(fieldSchema)) {
    return false
  }

  const ast = Reflect.get(fieldSchema, 'ast')
  if (!Predicate.isObject(ast)) {
    return false
  }

  const context = Reflect.get(ast, 'context')
  return (
    Predicate.isObject(context) && Reflect.get(context, 'isOptional') === true
  )
}

type RuntimeWrappedStorage =
  | Readonly<{
      keyFields: object
      childField: string
      kind: 'Array' | 'Option'
    }>
  | Readonly<{
      keyFields: unknown
      childField: undefined
      kind: 'Array'
    }>

const wrappedStorageOf = (
  parentModel: unknown,
  childModel: unknown,
  field: string,
  childField: unknown,
): Extract<RuntimeWrappedStorage, Readonly<{ childField: string }>> => {
  const parentFields = fieldsOf(parentModel)
  const storageSchema = Predicate.isObject(parentFields)
    ? Reflect.get(parentFields, field)
    : undefined
  const itemSchema = Schema.isSchema(storageSchema)
    ? Reflect.get(storageSchema, 'value')
    : undefined
  const itemFields = fieldsOf(itemSchema)
  const isArrayStorage =
    Schema.isSchema(storageSchema) &&
    Schema.isSchema(itemSchema) &&
    hasSameDecodedSchemaShape(storageSchema, Schema.Array(itemSchema))
  const isOptionStorage =
    Schema.isSchema(storageSchema) &&
    Schema.isSchema(itemSchema) &&
    hasSameDecodedSchemaShape(storageSchema, Schema.Option(itemSchema))

  if (
    !Schema.isSchema(storageSchema) ||
    isOptionalField(storageSchema) ||
    !Schema.isSchema(itemSchema) ||
    !Predicate.isObject(itemFields) ||
    (!isArrayStorage && !isOptionStorage)
  ) {
    throw new Error(
      '[foldkit] A wrapped keyed field Binding requires a required Schema.Array of declared Struct wrappers or a required Schema.Option of one declared Struct wrapper.',
    )
  }

  const itemAst = SchemaAST.toType(itemSchema.ast)
  if (
    !SchemaAST.isObjects(itemAst) ||
    !Array.isReadonlyArrayEmpty(itemAst.indexSignatures) ||
    !Array.every(Reflect.ownKeys(itemFields), name =>
      Schema.isSchema(Reflect.get(itemFields, name)),
    ) ||
    !hasSameDecodedSchemaShape(
      itemSchema,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      Schema.Struct(itemFields as Schema.Struct.Fields),
    )
  ) {
    throw new Error(
      '[foldkit] A wrapped keyed field Binding requires unambiguous declared Struct wrapper fields.',
    )
  }

  if (
    !Predicate.isString(childField) ||
    !Object.hasOwn(itemFields, childField)
  ) {
    throw new Error(
      '[foldkit] A wrapped keyed field Binding must select a declared childField on each wrapper.',
    )
  }

  const childFieldSchema = Reflect.get(itemFields, childField)
  if (
    isOptionalField(childFieldSchema) ||
    !hasSameDecodedSchemaShape(childFieldSchema, childModel)
  ) {
    throw new Error(
      '[foldkit] A wrapped keyed field Binding childField must be required and have exactly the same decoded shape as the child Model.',
    )
  }

  return {
    keyFields: itemFields,
    childField,
    kind: isOptionStorage ? 'Option' : 'Array',
  }
}

const readWrappedChild = (item: unknown, childField: string): unknown => {
  if (!Predicate.isObject(item) || !Object.hasOwn(item, childField)) {
    throw new Error(
      `[foldkit] A wrapped keyed field Binding item must contain its own required childField "${childField}".`,
    )
  }

  return Reflect.get(item, childField)
}

const isInstanceKeyAst = (
  ast: SchemaAST.AST,
  visited: Set<SchemaAST.AST>,
): boolean => {
  if (visited.has(ast)) {
    return true
  }

  visited.add(ast)
  if (SchemaAST.isSuspend(ast)) {
    return isInstanceKeyAst(ast.thunk(), visited)
  }

  if (
    SchemaAST.isString(ast) ||
    SchemaAST.isNumber(ast) ||
    SchemaAST.isTemplateLiteral(ast)
  ) {
    return true
  }

  if (SchemaAST.isLiteral(ast)) {
    return (
      Predicate.isString(ast.literal) ||
      (Predicate.isNumber(ast.literal) &&
        globalThis.Number.isFinite(ast.literal))
    )
  }

  return (
    SchemaAST.isUnion(ast) &&
    Array.every(ast.types, type => isInstanceKeyAst(type, visited))
  )
}

/** @internal Checks that a Schema decodes only supported Binding keys. */
export const isInstanceKeySchema = (
  schema: unknown,
): schema is Schema.Top & Schema.Schema<InstanceKey> =>
  Schema.isSchema(schema) &&
  isInstanceKeyAst(SchemaAST.toType(schema.ast), new Set())

const readInstanceKey = (
  childModel: unknown,
  keyField: string,
): InstanceKey => {
  if (!Predicate.isObject(childModel)) {
    throw new Error(
      '[foldkit] A keyed field Binding child Model must be an object with its declared key field.',
    )
  }

  const key = Reflect.get(childModel, keyField)
  if (
    !Predicate.isString(key) &&
    !(Predicate.isNumber(key) && globalThis.Number.isFinite(key))
  ) {
    throw new Error(
      '[foldkit] A keyed field Binding requires string or finite number keys.',
    )
  }

  return key
}

const readInitialOccurrenceKey = (
  key: unknown,
  field: string,
  index: number,
): InstanceKey => {
  if (
    !Predicate.isString(key) &&
    !(Predicate.isNumber(key) && globalThis.Number.isFinite(key))
  ) {
    throw new Error(
      `[foldkit] Wrapped keyed Binding field "${field}" init occurrence at index ${index} requires a string or finite number key.`,
    )
  }

  return key
}

const assertMatchingChildKey = (
  key: InstanceKey,
  childModel: unknown,
  keyField: string,
): void => {
  if (readInstanceKey(childModel, keyField) !== key) {
    throw new Error(
      '[foldkit] A keyed field Binding cannot initialize or replace a child with a different key.',
    )
  }
}

/** @internal Lowers direct or wrapped keyed-field shorthand into the shared keyed Binding adapter. */
export const normalizeKeyedFieldConfig = (config: unknown): unknown => {
  if (!Predicate.isObject(config)) {
    return config
  }

  const Model = Reflect.get(config, 'Model')
  const ChildModel = Reflect.get(config, 'ChildModel')
  const field = Reflect.get(config, 'field')
  const keyField = Reflect.get(config, 'key')
  const parentFields = fieldsOf(Model)

  const allowedFields = new Set([
    'Model',
    'ChildModel',
    'childField',
    'field',
    'key',
    'placement',
    'toParentMessage',
    'subscriptions',
    'outMessage',
    'readAll',
    'read',
    'write',
    'writeAt',
    'presentWhen',
    'parentMessage',
    'fromParentMessage',
    'init',
  ])
  for (const configField of Reflect.ownKeys(config)) {
    if (!Predicate.isString(configField) || !allowedFields.has(configField)) {
      throw new Error(
        `[foldkit] A keyed field Binding does not support the config field "${globalThis.String(configField)}".`,
      )
    }
  }

  if (
    !Predicate.isString(field) ||
    !Predicate.isObject(parentFields) ||
    !Object.hasOwn(parentFields, field)
  ) {
    throw new Error(
      '[foldkit] A keyed field Binding must select a declared parent Struct Model field.',
    )
  }

  const storage: RuntimeWrappedStorage = Object.hasOwn(config, 'childField')
    ? wrappedStorageOf(
        Model,
        ChildModel,
        field,
        Reflect.get(config, 'childField'),
      )
    : {
        keyFields: fieldsOf(ChildModel),
        childField: undefined,
        kind: 'Array',
      }

  if (
    storage.childField === undefined &&
    !isKeyedFieldStorage(Model, ChildModel, field)
  ) {
    throw new Error(
      '[foldkit] A keyed field Binding field must be an exact array of the child Model.',
    )
  }

  const { keyFields, childField, kind } = storage
  if (kind === 'Option' && Object.hasOwn(config, 'init')) {
    throw new Error(
      '[foldkit] An Option-wrapped keyed field Binding cannot use init.instances; the parent owns its optional presence. Use Binding.init with an explicit toParentModel when creating an occurrence.',
    )
  }
  if (childField !== undefined && keyField === childField) {
    throw new Error(
      '[foldkit] A wrapped keyed field Binding key and childField must be distinct.',
    )
  }

  if (
    !Predicate.isString(keyField) ||
    !Predicate.isObject(keyFields) ||
    !Object.hasOwn(keyFields, keyField)
  ) {
    throw new Error(
      childField === undefined
        ? '[foldkit] A keyed field Binding must select a declared child Model key field.'
        : '[foldkit] A wrapped keyed field Binding must select a declared wrapper key field.',
    )
  }

  if (isOptionalField(Reflect.get(keyFields, keyField))) {
    throw new Error(
      '[foldkit] A keyed field Binding key field must be required.',
    )
  }

  if (!isInstanceKeySchema(Reflect.get(keyFields, keyField))) {
    throw new Error(
      '[foldkit] A keyed field Binding key field Schema must decode to a string or number.',
    )
  }

  for (const adapterField of [
    'readAll',
    'read',
    'write',
    'writeAt',
    'presentWhen',
    'parentMessage',
  ]) {
    if (Object.hasOwn(config, adapterField)) {
      throw new Error(
        '[foldkit] A keyed field Binding cannot also supply custom accessors, presentWhen, or a parentMessage mapping.',
      )
    }
  }

  const toParentMessage = Reflect.get(config, 'toParentMessage')
  if (!Predicate.isFunction(toParentMessage)) {
    throw new Error(
      '[foldkit] A keyed field Binding must supply an explicit key-aware toParentMessage mapper.',
    )
  }

  const {
    Model: _,
    ChildModel: __,
    field: ___,
    key: ____,
    childField: _____,
    init: ______,
    ...policy
  } = config
  const readAll = (model: object): ReadonlyArray<unknown> => {
    const children = Reflect.get(model, field)
    if (kind === 'Option') {
      if (!Option.isOption(children)) {
        throw new Error(
          `[foldkit] Wrapped keyed field Binding field "${field}" must contain an Option Struct wrapper.`,
        )
      }

      return Option.toArray(children)
    }

    if (!globalThis.Array.isArray(children)) {
      throw new Error(
        childField === undefined
          ? `[foldkit] Keyed field Binding field "${field}" must contain an array of child Models.`
          : `[foldkit] Wrapped keyed field Binding field "${field}" must contain an array of Struct wrappers.`,
      )
    }

    return children
  }

  const keyOf = (item: unknown): InstanceKey => {
    if (
      childField !== undefined &&
      (!Predicate.isObject(item) || !Object.hasOwn(item, keyField))
    ) {
      throw new Error(
        `[foldkit] A wrapped keyed field Binding item must contain its own required key field "${keyField}".`,
      )
    }

    return readInstanceKey(item, keyField)
  }

  const normalized = {
    ...policy,
    placement: Reflect.get(policy, 'placement') ?? field,
    readAll,
    key: keyOf,
    read: (item: unknown) =>
      childField === undefined ? item : readWrappedChild(item, childField),
    ...(childField === undefined
      ? {
          validateChildKey: (key: InstanceKey, childModel: unknown) =>
            assertMatchingChildKey(key, childModel, keyField),
        }
      : {}),
    writeAt: (
      model: globalThis.Record<string, unknown>,
      key: InstanceKey,
      nextChildModel: unknown,
    ) => {
      if (kind === 'Option') {
        const maybeItem = Reflect.get(model, field)
        if (!Option.isOption(maybeItem)) {
          throw new Error(
            `[foldkit] Wrapped keyed field Binding field "${field}" must contain an Option Struct wrapper.`,
          )
        }

        if (Option.isNone(maybeItem) || keyOf(maybeItem.value) !== key) {
          return model
        }

        readWrappedChild(maybeItem.value, childField)
        const nextItem = modifyFields(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          maybeItem.value as globalThis.Record<string, unknown>,
          { [childField]: () => nextChildModel },
        )
        return modifyFields(model, {
          [field]: () => Option.some(nextItem),
        })
      }

      if (childField === undefined) {
        assertMatchingChildKey(key, nextChildModel, keyField)
      }

      return modifyFields(model, {
        [field]: children => {
          if (!globalThis.Array.isArray(children)) {
            throw new Error(
              '[foldkit] A keyed field Binding field must contain an array.',
            )
          }

          return Array.map(children, item => {
            if (keyOf(item) !== key) {
              return item
            }

            if (childField === undefined) {
              return nextChildModel
            }

            readWrappedChild(item, childField)
            return modifyFields(
              /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
              item as globalThis.Record<string, unknown>,
              { [childField]: () => nextChildModel },
            )
          })
        },
      })
    },
  }

  if (kind === 'Option' && childField !== undefined) {
    initializationStorage.set(normalized, {
      kind: 'KeyedOption',
      field,
      keyField,
      childField,
      isPlainWrapper: Reflect.ownKeys(keyFields).length === 2,
    })
  }

  return normalized
}

/** @internal Validates and lowers a keyed field initialization policy. */
export const wrappedKeyedInitialPolicyOf = (
  config: unknown,
  normalizedConfig: unknown,
): RuntimeWrappedKeyedInitialPolicy | undefined => {
  if (!Predicate.isObject(config) || !Object.hasOwn(config, 'init')) {
    return undefined
  }

  const field = Reflect.get(config, 'field')
  if (!Predicate.isString(field)) {
    throw new Error(
      '[foldkit] A wrapped keyed init policy requires a string Model field.',
    )
  }

  const init = Reflect.get(config, 'init')
  if (!Predicate.isObject(init)) {
    throw new Error(
      `[foldkit] Keyed Binding field "${field}" init must be an object with instances and toItem functions.`,
    )
  }

  for (const policyField of Reflect.ownKeys(init)) {
    if (policyField !== 'instances' && policyField !== 'toItem') {
      throw new Error(
        `[foldkit] Keyed Binding field "${field}" init does not support the policy field "${globalThis.String(policyField)}".`,
      )
    }
  }

  const instances = Reflect.get(init, 'instances')
  const toItem = Reflect.get(init, 'toItem')
  if (!Predicate.isFunction(instances) || !Predicate.isFunction(toItem)) {
    throw new Error(
      `[foldkit] Keyed Binding field "${field}" init must supply instances and toItem functions.`,
    )
  }

  const readItemKey = Predicate.isObject(normalizedConfig)
    ? Reflect.get(normalizedConfig, 'key')
    : undefined
  if (!Predicate.isFunction(readItemKey)) {
    throw new Error(
      `[foldkit] Keyed Binding field "${field}" init requires its normalized key reader.`,
    )
  }

  return {
    kind: 'WrappedKeyed',
    field,
    resolveOccurrences: context => {
      const values = Reflect.apply(instances, undefined, [context])
      if (!globalThis.Array.isArray(values)) {
        throw new Error(
          `[foldkit] Keyed Binding field "${field}" init.instances must return an array.`,
        )
      }

      const keys = new Set<InstanceKey>()
      return Array.map(
        values,
        (occurrence, index): RuntimeWrappedKeyedInitialOccurrence => {
          if (
            !Predicate.isObject(occurrence) ||
            !Object.hasOwn(occurrence, 'key') ||
            !Object.hasOwn(occurrence, 'args')
          ) {
            throw new Error(
              `[foldkit] Keyed Binding field "${field}" init occurrence at index ${index} must contain its own key and args fields.`,
            )
          }

          const key = readInitialOccurrenceKey(
            Reflect.get(occurrence, 'key'),
            field,
            index,
          )
          const args = Reflect.get(occurrence, 'args')
          if (!globalThis.Array.isArray(args)) {
            throw new Error(
              `[foldkit] Keyed Binding field "${field}" init occurrence at index ${index} args must be a child init argument tuple.`,
            )
          }

          if (keys.has(key)) {
            throw new Error(
              `[foldkit] Keyed Binding field "${field}" init.instances contains duplicate key "${globalThis.String(key)}".`,
            )
          }
          keys.add(key)

          return { occurrence, key, args }
        },
      )
    },
    toItem: (occurrence, childModel) =>
      Reflect.apply(toItem, undefined, [occurrence, childModel]),
    readItemKey: item => Reflect.apply(readItemKey, undefined, [item]),
  }
}
