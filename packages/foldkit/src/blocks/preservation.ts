import {
  Effect,
  Option,
  Schema,
  type SchemaAST,
  SchemaParser,
  SchemaTransformation,
} from 'effect'

import {
  type RuntimeBlock,
  type RuntimeInstance,
  makeInstance,
} from './engine.js'

const PreservedInstance = Schema.Struct({
  id: Schema.String,
  model: Schema.Unknown,
})

/** @internal The JSON form of a Block instance: its id and its Model encoded
 *  with the Block's Model Schema. Child instances inside that Model encode
 *  the same way. Decoding produces the instance value again; what runs for
 *  it starts when a Model holds it. */
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
      decode: ({ id, model }, options) => {
        const codec = modelCodec()
        return Effect.map(
          codec === undefined
            ? Effect.succeed(undefined)
            : SchemaParser.decodeUnknownEffect(codec)(model, options),
          decoded => makeInstance(block, id, undefined, Option.some(decoded)),
        )
      },
      encode: (instance, options) => {
        const codec = modelCodec()
        return Effect.map(
          codec === undefined
            ? Effect.succeed(null)
            : SchemaParser.encodeUnknownEffect(codec)(instance.model, options),
          model => ({ id: instance.id, model }),
        )
      },
    }),
  )
}
