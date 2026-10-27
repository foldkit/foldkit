import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const ResultTarget = defineTaggedUnion({
  Issue: { issueId: Schema.String },
  Project: { projectId: Schema.String },
})
