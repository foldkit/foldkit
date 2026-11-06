import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const OutMessage = defineMessageUnion({
  RequestedCreation: { status: Issue.Status },
  RequestedMove: {
    issueId: Schema.String,
    status: Issue.Status,
    insertionIndex: Schema.Number,
  },
})
export type OutMessage = typeof OutMessage.Type
