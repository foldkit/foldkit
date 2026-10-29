import { Schema } from 'effect'

export const Model = Schema.Struct({
  copiedSnippetIds: Schema.HashSet(Schema.String),
})
export type Model = typeof Model.Type
