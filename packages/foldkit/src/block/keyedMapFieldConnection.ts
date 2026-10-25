import {
  Array,
  HashMap,
  Option,
  Predicate,
  Record,
  Schema,
  SchemaAST,
} from 'effect'

import { modifyFields } from '../struct/index.js'
import { hasSameDecodedSchemaShape } from './decodedSchemaShape.js'
import type { InstanceKey } from './instanceContext.js'
import { isInstanceKeySchema } from './keyedFieldConnection.js'

const keyedMapBindingConfigs = new WeakSet<object>()

/** @internal Marks configuration supplied through the explicit map Binding helper. */
export const asKeyedMapBindingConfig = (config: object): object => {
  const markedConfig = { ...config }
  keyedMapBindingConfigs.add(markedConfig)
  return markedConfig
}

/** @internal Distinguishes explicit map storage from a child's whole Record or HashMap Model. */
export const isKeyedMapBindingConfig = (config: object): boolean =>
  keyedMapBindingConfigs.has(config)

type IsAny<Value> = 0 extends 1 & Value ? true : false

type IsNever<Value> = [Value] extends [never] ? true : false

type Exact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false

type StorageSchemaAt<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field extends keyof ParentModelSchema['fields'],
> = ParentModelSchema['fields'][Field]

type KeySchemaOf<StorageSchema> =
  StorageSchema extends Schema.HashMap<
    infer KeySchema extends Schema.Constraint,
    infer _ValueSchema extends Schema.Constraint
  >
    ? KeySchema
    : StorageSchema extends Schema.$Record<
          infer KeySchema extends Schema.Record.Key,
          infer _ValueSchema extends Schema.Constraint
        >
      ? KeySchema
      : never

type ValueSchemaOf<StorageSchema> =
  StorageSchema extends Schema.HashMap<
    infer _KeySchema extends Schema.Constraint,
    infer ValueSchema extends Schema.Constraint
  >
    ? ValueSchema
    : StorageSchema extends Schema.$Record<
          infer _KeySchema extends Schema.Record.Key,
          infer ValueSchema extends Schema.Constraint
        >
      ? ValueSchema
      : never

type IsSupportedKeySchema<StorageSchema> =
  StorageSchema extends Schema.HashMap<
    infer HashMapKeySchema extends Schema.Constraint,
    infer _HashMapValueSchema extends Schema.Constraint
  >
    ? IsNever<HashMapKeySchema['Type']> extends true
      ? false
      : IsAny<HashMapKeySchema['Type']> extends true
        ? false
        : [HashMapKeySchema['Type']] extends [InstanceKey]
          ? true
          : false
    : StorageSchema extends Schema.$Record<
          infer RecordKeySchema extends Schema.Record.Key,
          infer _RecordValueSchema extends Schema.Constraint
        >
      ? IsNever<RecordKeySchema['Type']> extends true
        ? false
        : IsAny<RecordKeySchema['Type']> extends true
          ? false
          : [RecordKeySchema['Type']] extends [string]
            ? true
            : false
      : false

type IsRequiredField<ParentModel, Field extends keyof ParentModel> =
  {} extends Pick<ParentModel, Field> ? false : true

/** @internal The Schema-derived key of a Record or HashMap parent field. */
export type KeyedMapKeySchemaAt<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field extends keyof ParentModelSchema['fields'] & string,
> = Extract<KeySchemaOf<StorageSchemaAt<ParentModelSchema, Field>>, Schema.Top>

/** @internal The decoded Schema-derived key of a Record or HashMap parent field. */
export type KeyedMapKeyAt<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field extends keyof ParentModelSchema['fields'] & string,
> = Extract<KeyedMapKeySchemaAt<ParentModelSchema, Field>['Type'], InstanceKey>

/** @internal Whether a required parent field is an exact supported keyed map. */
export type IsExactKeyedMapField<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field extends keyof ParentModelSchema['fields'] & string,
  ChildModel,
> =
  IsRequiredField<ParentModelSchema['Type'], Field> extends true
    ? IsSupportedKeySchema<
        StorageSchemaAt<ParentModelSchema, Field>
      > extends true
      ? Exact<
          ValueSchemaOf<StorageSchemaAt<ParentModelSchema, Field>>['Type'],
          ChildModel
        >
      : false
    : false

/** @internal Whether a required parent map has a closed wrapper with an exact child field. */
export type IsWrappedKeyedMapField<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  Field extends keyof ParentModelSchema['fields'] & string,
  ChildField extends string,
  ChildModel,
> =
  IsRequiredField<ParentModelSchema['Type'], Field> extends true
    ? IsSupportedKeySchema<
        StorageSchemaAt<ParentModelSchema, Field>
      > extends true
      ? ValueSchemaOf<
          StorageSchemaAt<ParentModelSchema, Field>
        > extends Schema.Struct<Schema.Struct.Fields>
        ? ChildField extends keyof ValueSchemaOf<
            StorageSchemaAt<ParentModelSchema, Field>
          >['Type'] &
            string
          ? {} extends Pick<
              ValueSchemaOf<StorageSchemaAt<ParentModelSchema, Field>>['Type'],
              ChildField
            >
            ? false
            : Exact<
                ValueSchemaOf<
                  StorageSchemaAt<ParentModelSchema, Field>
                >['Type'][ChildField],
                ChildModel
              >
          : false
        : false
      : false
    : false

/** @internal Restricts map shorthand fields to one valid exact or wrapped storage field. */
export type KeyedMapField<
  ParentModelSchema extends Schema.Struct<Schema.Struct.Fields>,
  ChildModel,
  ChildField extends string = never,
> = Extract<
  {
    [Field in keyof ParentModelSchema['fields'] & string]: [
      ChildField,
    ] extends [never]
      ? IsExactKeyedMapField<ParentModelSchema, Field, ChildModel> extends true
        ? Field
        : never
      : IsWrappedKeyedMapField<
            ParentModelSchema,
            Field,
            ChildField,
            ChildModel
          > extends true
        ? Field
        : never
  }[keyof ParentModelSchema['fields'] & string],
  string
>

const isOptionalField = (fieldSchema: unknown): boolean => {
  return Schema.isSchema(fieldSchema) && SchemaAST.isOptional(fieldSchema.ast)
}

const isStringKeyAst = (
  ast: SchemaAST.AST,
  visited: Set<SchemaAST.AST>,
): boolean => {
  if (visited.has(ast)) {
    return true
  }

  visited.add(ast)
  const typeAst = SchemaAST.toType(ast)
  if (SchemaAST.isSuspend(typeAst)) {
    return isStringKeyAst(typeAst.thunk(), visited)
  }

  if (SchemaAST.isString(typeAst) || SchemaAST.isTemplateLiteral(typeAst)) {
    return true
  }

  if (SchemaAST.isLiteral(typeAst)) {
    return Predicate.isString(typeAst.literal)
  }

  return (
    SchemaAST.isUnion(typeAst) &&
    Array.every(typeAst.types, member => isStringKeyAst(member, visited))
  )
}

const isRecordSchema = (
  schema: unknown,
): schema is Schema.$Record<Schema.Record.Key, Schema.Constraint> =>
  Schema.isSchema(schema) &&
  SchemaAST.isObjects(SchemaAST.toType(schema.ast)) &&
  Schema.isSchema(Reflect.get(schema, 'key')) &&
  Schema.isSchema(Reflect.get(schema, 'value'))

const isHashMapSchema = (
  schema: unknown,
): schema is Schema.HashMap<Schema.Constraint, Schema.Constraint> => {
  if (!Schema.isSchema(schema)) {
    return false
  }

  const ast = SchemaAST.toType(schema.ast)
  if (!SchemaAST.isDeclaration(ast)) {
    return false
  }

  const annotations = Reflect.get(ast, 'annotations')
  const representation = Predicate.isObject(annotations)
    ? Reflect.get(annotations, 'representation')
    : undefined

  return (
    Predicate.isObject(representation) &&
    Reflect.get(representation, 'id') === 'effect/schema/HashMap'
  )
}

type RuntimeStorage = Readonly<{
  childField?: string
  field: string
  keySchema: Schema.Top
  kind: 'HashMap' | 'Record'
}>

const storageOf = (
  parentModel: unknown,
  childModel: unknown,
  field: string,
  childField: unknown,
): RuntimeStorage => {
  const parentFields = Schema.isSchema(parentModel)
    ? Reflect.get(parentModel, 'fields')
    : undefined
  const storageSchema = Predicate.isObject(parentFields)
    ? Reflect.get(parentFields, field)
    : undefined

  if (
    !Schema.isSchema(storageSchema) ||
    isOptionalField(storageSchema) ||
    (!isRecordSchema(storageSchema) && !isHashMapSchema(storageSchema))
  ) {
    throw new Error(
      '[foldkit] A keyed map field Binding requires a required Schema.Record or Schema.HashMap parent field.',
    )
  }

  const keySchema = storageSchema.key
  if (!Schema.isSchema(keySchema)) {
    throw new Error(
      '[foldkit] A keyed map field Binding requires an inspectable key Schema.',
    )
  }
  if (isRecordSchema(storageSchema)) {
    if (!isStringKeyAst(keySchema.ast, new Set())) {
      throw new Error(
        '[foldkit] A Record field Binding key Schema must decode to strings without property-key coercion.',
      )
    }
  } else if (!isInstanceKeySchema(keySchema)) {
    throw new Error(
      '[foldkit] A HashMap field Binding key Schema must decode to a string or finite number occurrence key.',
    )
  }

  const valueSchema = storageSchema.value
  if (childField === undefined) {
    if (!hasSameDecodedSchemaShape(valueSchema, childModel)) {
      throw new Error(
        '[foldkit] A keyed map field Binding value Schema must have exactly the same decoded shape as the child Model.',
      )
    }
  } else {
    const valueFields = Schema.isSchema(valueSchema)
      ? Reflect.get(valueSchema, 'fields')
      : undefined
    const valueAst = Schema.isSchema(valueSchema)
      ? SchemaAST.toType(valueSchema.ast)
      : undefined
    if (
      !Predicate.isString(childField) ||
      !Predicate.isObject(valueFields) ||
      !Predicate.isObject(valueAst) ||
      !SchemaAST.isObjects(valueAst) ||
      !Array.isReadonlyArrayEmpty(valueAst.indexSignatures) ||
      !Object.hasOwn(valueFields, childField)
    ) {
      throw new Error(
        '[foldkit] A wrapped keyed map field Binding requires a closed Struct value with a declared childField.',
      )
    }

    const childFieldSchema = Reflect.get(valueFields, childField)
    if (
      isOptionalField(childFieldSchema) ||
      !hasSameDecodedSchemaShape(childFieldSchema, childModel)
    ) {
      throw new Error(
        '[foldkit] A wrapped keyed map field Binding childField must be required and have exactly the same decoded shape as the child Model.',
      )
    }
  }

  return {
    field,
    keySchema,
    kind: isHashMapSchema(storageSchema) ? 'HashMap' : 'Record',
    ...(Predicate.isString(childField) ? { childField } : {}),
  }
}

const readWrappedChild = (value: unknown, childField: string): unknown => {
  if (!Predicate.isObject(value) || !Object.hasOwn(value, childField)) {
    throw new Error(
      `[foldkit] A wrapped keyed map Binding value must contain its own required childField "${childField}".`,
    )
  }

  return Reflect.get(value, childField)
}

const updateValue = (
  value: unknown,
  childField: string | undefined,
  nextChildModel: unknown,
): unknown => {
  if (childField === undefined) {
    return nextChildModel
  }

  if (!Predicate.isObject(value)) {
    throw new Error(
      `[foldkit] A wrapped keyed map Binding value must contain its own required childField "${childField}".`,
    )
  }
  readWrappedChild(value, childField)
  return modifyFields(value, { [childField]: () => nextChildModel })
}

/** @internal Whether a Struct field is supported exact or wrapped keyed map storage. */
export const isKeyedMapFieldStorage = (
  parentModel: unknown,
  field: unknown,
): boolean => {
  if (!Predicate.isString(field) || !Schema.isSchema(parentModel)) {
    return false
  }

  const fields = Reflect.get(parentModel, 'fields')
  if (!Predicate.isObject(fields) || !Object.hasOwn(fields, field)) {
    return false
  }

  const fieldSchema = Reflect.get(fields, field)
  return isRecordSchema(fieldSchema) || isHashMapSchema(fieldSchema)
}

/** @internal Lowers Record and HashMap fields into the shared keyed Binding adapter. */
export const normalizeKeyedMapFieldConfig = (
  config: unknown,
): Readonly<Record<string, unknown>> => {
  if (!Predicate.isObject(config)) {
    throw new Error(
      '[foldkit] A keyed map field Binding requires a configuration object.',
    )
  }

  const Model = Reflect.get(config, 'Model')
  const ChildModel = Reflect.get(config, 'ChildModel')
  const field = Reflect.get(config, 'field')
  const childField = Reflect.get(config, 'childField')
  if (!Predicate.isString(field)) {
    throw new Error(
      '[foldkit] A keyed map field Binding must select a declared parent Struct Model field.',
    )
  }

  const allowedFields = new Set([
    'Model',
    'ChildModel',
    'childField',
    'field',
    'placement',
    'subscriptions',
    'outMessage',
    'delivery',
    'toParentMessage',
  ])
  for (const configField of Reflect.ownKeys(config)) {
    if (!Predicate.isString(configField) || !allowedFields.has(configField)) {
      throw new Error(
        `[foldkit] A keyed map field Binding does not support the config field "${globalThis.String(configField)}".`,
      )
    }
  }

  const storage = storageOf(Model, ChildModel, field, childField)
  const isKey = Reflect.apply(Schema.is, undefined, [storage.keySchema])
  const readKey = (key: unknown): InstanceKey => {
    if (!isKey(key)) {
      throw new Error(
        `[foldkit] Keyed map field Binding field "${field}" contains a key outside its declared Schema.`,
      )
    }
    if (
      !Predicate.isString(key) &&
      !(Predicate.isNumber(key) && globalThis.Number.isFinite(key))
    ) {
      throw new Error(
        `[foldkit] Keyed map field Binding field "${field}" requires string or finite number occurrence keys.`,
      )
    }

    return key
  }

  const readRecord = (model: object): globalThis.Record<string, unknown> => {
    const value = Reflect.get(model, field)
    if (!Predicate.isObject(value) || HashMap.isHashMap(value)) {
      throw new Error(
        `[foldkit] Record field Binding field "${field}" must contain a Record.`,
      )
    }

    return value
  }
  const readHashMap = (model: object): HashMap.HashMap<unknown, unknown> => {
    const value = Reflect.get(model, field)
    if (!HashMap.isHashMap(value)) {
      throw new Error(
        `[foldkit] HashMap field Binding field "${field}" must contain an Effect HashMap.`,
      )
    }

    return value
  }
  const readAll = (
    model: object,
  ): ReadonlyArray<Readonly<{ key: InstanceKey; value: unknown }>> => {
    if (storage.kind === 'Record') {
      const record = readRecord(model)
      return Array.map(Record.keys(record), key => ({
        key: readKey(key),
        value: Reflect.get(record, key),
      }))
    }

    return Array.map(HashMap.toEntries(readHashMap(model)), ([key, value]) => ({
      key: readKey(key),
      value,
    }))
  }

  const {
    Model: _,
    ChildModel: __,
    field: ___,
    childField: ____,
    ...policy
  } = config
  return {
    ...policy,
    readAll,
    key: (entry: Readonly<{ key: InstanceKey }>) => entry.key,
    read: (entry: Readonly<{ value: unknown }>) =>
      storage.childField === undefined
        ? entry.value
        : readWrappedChild(entry.value, storage.childField),
    writeAt: (
      model: globalThis.Record<string, unknown>,
      key: InstanceKey,
      nextChildModel: unknown,
    ) => {
      if (storage.kind === 'Record') {
        const record = readRecord(model)
        if (!Predicate.isString(key) || !Object.hasOwn(record, key)) {
          return model
        }

        const nextRecord = Option.getOrElse(
          Record.modify(record, key, value =>
            updateValue(value, storage.childField, nextChildModel),
          ),
          () => record,
        )
        return modifyFields(model, { [field]: () => nextRecord })
      }

      const map = readHashMap(model)
      const maybeValue = HashMap.get(map, key)
      if (Option.isNone(maybeValue)) {
        return model
      }

      const nextValue = updateValue(
        maybeValue.value,
        storage.childField,
        nextChildModel,
      )
      return modifyFields(model, {
        [field]: () => HashMap.set(map, key, nextValue),
      })
    },
  }
}
