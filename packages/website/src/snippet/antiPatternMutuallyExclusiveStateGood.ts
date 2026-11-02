// ✅ Good: one variant describes the screen at a time.

import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const LoadState = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Loaded: { data: Schema.Array(Schema.String) },
  Failed: { error: Schema.String },
})
export type LoadState = typeof LoadState.Type

export const Model = Schema.Struct({
  loadState: LoadState,
})
export type Model = typeof Model.Type
