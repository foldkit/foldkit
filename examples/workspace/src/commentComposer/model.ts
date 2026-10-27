import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const PostState = defineTaggedUnion({
  Idle: {},
  Posting: {},
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  postState: PostState,
})
