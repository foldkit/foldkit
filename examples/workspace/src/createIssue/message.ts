import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue, IssueStatus } from '../domain'

export const Message = defineMessageUnion({
  RequestedOpen: {
    projectId: Schema.String,
    status: Schema.optionalKey(IssueStatus),
  },
  RequestedClose: {},
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  SucceededCreateIssue: { issue: Issue },
  FailedCreateIssue: { error: Schema.String },
})
