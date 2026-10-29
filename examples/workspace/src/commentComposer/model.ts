import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const PostState = defineTaggedUnion({
  Idle: {},
  Posting: {},
  Failed: { error: Schema.String },
})
export type PostState = typeof PostState.Type

export const Model = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  postState: PostState,
})
export type Model = typeof Model.Type
