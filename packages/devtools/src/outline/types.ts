import { Schema } from 'effect'

export type { OutlineRect } from 'foldkit/outline'

export const ActiveOutline = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  targetX: Schema.Number,
  targetY: Schema.Number,
  targetWidth: Schema.Number,
  targetHeight: Schema.Number,
  frame: Schema.Number,
  count: Schema.Number,
  cause: Schema.optional(Schema.String),
})
export type ActiveOutline = typeof ActiveOutline.Type
