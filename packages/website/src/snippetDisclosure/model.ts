import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const SnippetSize = defineTaggedUnion({
  Fits: {},
  Overflows: {},
})
export type SnippetSize = typeof SnippetSize.Type

export const Model = Schema.Struct({
  openSnippetIds: Schema.HashSet(Schema.String),
  snippetSizes: Schema.HashMap(Schema.String, SnippetSize),
})
export type Model = typeof Model.Type
