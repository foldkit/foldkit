import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  SucceededCreateIssue: { issue: Issue.Issue },
  FailedCreateIssue: { error: Schema.String },
})
export type Message = typeof Message.Type
