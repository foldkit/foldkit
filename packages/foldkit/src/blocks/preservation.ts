import {
  Effect,
  Schema,
  type SchemaAST,
  SchemaParser,
  SchemaTransformation,
} from 'effect'

import {
  type RuntimeBlock,
  type RuntimeInstance,
  instancePath,
  makePreserved,
} from './engine.js'

const PreservedInstance = Schema.Struct({
  id: Schema.String,
  path: Schema.Array(Schema.String),
  model: Schema.Unknown,
})

/** @internal The JSON form of a Block instance: its id, its path, and its
 *  Model encoded with the Block's Model Schema. Child instances inside that
 *  Model encode the same way. Decoding produces stand-ins that a program
 *  restores onto a freshly constructed graph. */
export const instanceJsonLink = (
  block: RuntimeBlock,
  maybeModel: Schema.Top | undefined,
): SchemaAST.Link => {
  const modelCodec = (): Schema.Codec<unknown, unknown> | undefined =>
    maybeModel === undefined
      ? undefined
      : /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Schema.toCodecJson(maybeModel as Schema.Codec<unknown, unknown>)

  return Schema.link<RuntimeInstance>()(
    PreservedInstance,
    SchemaTransformation.transformEffect({
      decode: ({ id, path, model }, options) => {
        const codec = modelCodec()
        return Effect.map(
          codec === undefined
            ? Effect.succeed(undefined)
            : SchemaParser.decodeUnknownEffect(codec)(model, options),
          decoded => makePreserved(block, id, { path, model: decoded }),
        )
      },
      encode: (instance, options) => {
        const codec = modelCodec()
        return Effect.map(
          codec === undefined
            ? Effect.succeed(null)
            : SchemaParser.encodeUnknownEffect(codec)(instance.model, options),
          model => ({ id: instance.id, path: instancePath(instance), model }),
        )
      },
    }),
  )
}
