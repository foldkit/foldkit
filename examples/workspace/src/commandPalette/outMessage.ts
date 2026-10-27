import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const OutMessage = defineMessageUnion({
  SelectedIssue: { issueId: Schema.String },
  SelectedProject: { projectId: Schema.String },
})
