// ✅ Good: one variant describes the screen at a time.

import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

const LoadState = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Loaded: { data: Schema.Array(Schema.String) },
  Failed: { error: Schema.String },
})
type LoadState = typeof LoadState.Type

const Model = Schema.Struct({
  loadState: LoadState,
})
type Model = typeof Model.Type
