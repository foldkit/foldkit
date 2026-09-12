import { Option, Schema } from 'effect'

export const OutlineRect = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  cause: Schema.optional(Schema.String),
})
export type OutlineRect = typeof OutlineRect.Type

export const OutlineRectBatch = Schema.Array(OutlineRect)

export const decodeOutlineRectBatch =
  Schema.decodeUnknownOption(OutlineRectBatch)

const TaggedMessage = Schema.Struct({ _tag: Schema.String })

export const outlineMessageTag = (value: unknown): Option.Option<string> =>
  Option.map(
    Schema.decodeUnknownOption(TaggedMessage)(value),
    ({ _tag }) => _tag,
  )
