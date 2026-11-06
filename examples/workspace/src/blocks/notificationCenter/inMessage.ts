import { Schema } from 'effect'
import { defineInMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const InMessage = defineInMessageUnion({
  InformedOfIssueComment: { issue: Issue.Issue, comment: Issue.Comment },
  InformedOfIssueAssignment: {
    issue: Issue.Issue,
    actorId: Schema.String,
    createdAt: Schema.String,
  },
})
export type InMessage = typeof InMessage.Type
