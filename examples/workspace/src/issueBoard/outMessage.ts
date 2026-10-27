import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { IssueStatus } from '../domain'

export const OutMessage = defineMessageUnion({
  RequestedCreation: { status: IssueStatus },
  RequestedMove: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
  },
})
