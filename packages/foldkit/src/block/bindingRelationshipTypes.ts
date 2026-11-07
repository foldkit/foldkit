import type { Schema } from 'effect'

type AnySchema = Schema.Codec<any, any, any, any>

/** @internal Distinguishes each existing field or accessor relationship. */
export type FieldRelationship =
  | 'Required'
  | 'Optional'
  | 'OptionalKeyed'
  | 'KeyedArray'
  | 'Custom'
  | 'Implicit'

/** @internal Gives each constructor its storage fields before contextual inference. */
export type RelationshipStorageFields<
  Kind extends FieldRelationship,
  Field extends string,
  KeyField extends string,
  ChildField extends string,
> = Kind extends 'Implicit'
  ? unknown
  : Kind extends 'Custom'
    ? Readonly<{
        field?: never
        key?: never
        childField?: never
        activeWhen?: never
        keySchema?: never
      }>
    : Kind extends 'Required' | 'Optional'
      ? Readonly<{
          field: Field
          key?: never
          childField?: never
          read?: never
          write?: never
          keySchema?: never
        }>
      : Readonly<{
          field: Field
          key: KeyField
          read?: never
          write?: never
          activeWhen?: never
          keySchema?: never
        }> &
          (Kind extends 'OptionalKeyed'
            ? Readonly<{ childField: ChildField }>
            : Readonly<{ childField?: ChildField }>)

/** @internal The two supported keyed map containers. */
export type MapRelationship = 'Record' | 'HashMap' | 'Implicit'

/** @internal Restricts a map constructor to its declared container Schema. */
export type MapRelationshipField<
  ModelSchema extends AnySchema,
  Kind extends MapRelationship,
  Field extends string,
> = Kind extends 'Implicit'
  ? Field
  : ModelSchema extends Schema.Struct<Schema.Struct.Fields>
    ? Field extends keyof ModelSchema['fields']
      ? ModelSchema['fields'][Field] extends Schema.HashMap<
          infer _KeySchema,
          infer _ValueSchema
        >
        ? Kind extends 'HashMap'
          ? Field
          : never
        : ModelSchema['fields'][Field] extends Schema.$Record<
              infer _KeySchema,
              infer _ValueSchema
            >
          ? Kind extends 'Record'
            ? Field
            : never
          : never
      : never
    : never
