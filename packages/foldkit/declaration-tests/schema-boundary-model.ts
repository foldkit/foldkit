import { Effect, Schema, SchemaTransformation } from 'effect'

export const Count = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Number,
    SchemaTransformation.transformEffect({
      decode: value => Effect.succeed(globalThis.Number(value)),
      encode: value => Effect.succeed(globalThis.String(value)),
    }),
  ),
  Schema.brand('PublicModelCount'),
)
export const Model = Schema.Struct({ count: Count })
