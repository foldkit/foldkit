import { type JsonSchema, Schema } from 'effect'

const JSON_SCHEMA_DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema'

/** Schema fields whose encoding and decoding require no services. */
export type ContextFields = {
  readonly [x: PropertyKey]: Schema.Codec<unknown, unknown, never, never>
}

/**
 * A declared, Schema-typed view of a Model for an in-app agent. It holds the
 * fields an agent may read, such as the current page, the selected record ids,
 * and the active filters, and the pure function that reads them from the
 * Model. Create one with {@link define}.
 *
 * @experimental Ships from `foldkit/experimental`; expect breaking changes while the API settles.
 */
export type AgentContext<Model, Fields extends ContextFields> = Readonly<{
  /** The Schema of the context. Use it in Command args and to decode the context on a server. */
  Context: Schema.Struct<Fields>
  /** The field map of the context, in the shape a Subscription entry takes. */
  fields: Fields
  /** Reads the context from the Model. The result holds only the declared fields. Throws when a field value does not match its Schema. Pass it as a Subscription's `modelToDependencies`. */
  read: (model: Model) => Schema.Struct.Type<Fields>
  /** Encodes a context as JSON. Only the declared fields appear in the result. Throws when a field value does not match its Schema. */
  encode: (context: Schema.Struct.Type<Fields>) => Schema.Json
  /** A standalone draft 2020-12 JSON Schema of the encoded context, including field annotations such as `description`. */
  jsonSchema: JsonSchema.JsonSchema
}>

/**
 * Declares the part of a Model that an in-app agent may read. The Model
 * Schema types the `read` parameter. The field map is the same shape you would
 * pass to `Schema.Struct`. `read` is a pure function from the Model to those
 * fields.
 *
 * The declared fields are the boundary. The returned `read` keeps only those
 * fields, so a `read` callback that returns more of the Model does not pass
 * the extra fields to a Command, a Subscription, or the agent. A Subscription
 * built from `fields` and `read` restarts only when a declared field changes.
 *
 * @example
 * ```ts
 * const WorkspaceAgentContext = AgentContext.define(
 *   Model,
 *   {
 *     page: Schema.Literals(['Inbox', 'Thread']),
 *     selectedThreadIds: Schema.Array(Schema.String),
 *   },
 *   {
 *     read: model => ({
 *       page: model.page,
 *       selectedThreadIds: model.selectedThreadIds,
 *     }),
 *   },
 * )
 * ```
 *
 * @experimental Ships from `foldkit/experimental`; expect breaking changes while the API settles.
 */
export const define = <
  ModelSchema extends Schema.Top,
  const Fields extends ContextFields,
>(
  _model: ModelSchema,
  fields: Fields,
  config: Readonly<{
    read: (model: ModelSchema['Type']) => Schema.Struct.Type<NoInfer<Fields>>
  }>,
): AgentContext<ModelSchema['Type'], Fields> => {
  const Context = Schema.Struct(fields)
  const keepDeclaredFields = Schema.decodeSync(Schema.toType(Context))
  const { schema, definitions } = Schema.toJsonSchemaDocument(Context)

  return {
    Context,
    fields,
    read: model => keepDeclaredFields(config.read(model)),
    encode: Schema.encodeSync(Schema.toCodecJson(Context)),
    jsonSchema: {
      $schema: JSON_SCHEMA_DRAFT_2020_12,
      ...schema,
      $defs: definitions,
    },
  }
}
