import { Predicate, Schema } from 'effect'

import type { InstanceSchema } from './public.js'

export type { ChildInstance, InstanceSchema } from './public.js'

declare const InstanceEvidenceTypeId: unique symbol
const InstanceSchemaTypeId = Symbol('foldkit/Block/InstanceSchema')
const schemaOwners = new WeakMap<object, unknown>()

/** @internal Identifies a ready child occurrence without encoding authoring metadata. */
export type InstanceEvidence<OwnerValue> = Readonly<{
  readonly [InstanceEvidenceTypeId]: OwnerValue
}>

/** @internal Creates a ready-only occurrence Schema; it never invokes child init. */
export const makeInstanceSchema = <OwnerValue, ModelSchema extends Schema.Top>(
  owner: OwnerValue,
  Model: ModelSchema,
): InstanceSchema<OwnerValue, ModelSchema> => {
  const instance = Schema.Struct({ key: Schema.String, model: Model })
  const identity = Object.freeze({})
  schemaOwners.set(identity, owner)

  return Schema.make<InstanceSchema<OwnerValue, ModelSchema>>(instance.ast, {
    [InstanceSchemaTypeId]: identity,
    fields: instance.fields,
    mapFields: instance.mapFields,
  })
}

/** @internal Reads authenticated Schema metadata, including ordinary Schema refinements. */
export const instanceOwnerOf = (schema: object): unknown => {
  const identity = Reflect.get(schema, InstanceSchemaTypeId)

  return Predicate.isObject(identity) ? schemaOwners.get(identity) : undefined
}

/** @internal Identifies opt-in occurrence fields once during passive Definition creation. */
export const instanceFieldsOf = (schema: unknown): ReadonlySet<PropertyKey> => {
  const fields = Schema.isSchema(schema)
    ? Reflect.get(schema, 'fields')
    : undefined
  const instanceFields = new Set<PropertyKey>()

  if (!Predicate.isObject(fields)) {
    return instanceFields
  }

  for (const field of Reflect.ownKeys(fields)) {
    const fieldSchema = Reflect.get(fields, field)
    const itemSchema = Schema.isSchema(fieldSchema)
      ? Reflect.get(fieldSchema, 'value')
      : undefined

    if (
      Schema.isSchema(itemSchema) &&
      instanceOwnerOf(itemSchema) !== undefined
    ) {
      instanceFields.add(field)
    }
  }

  return instanceFields
}
