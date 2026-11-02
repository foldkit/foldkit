import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { IssueStatus } from '../domain'

export const InMessage = defineMessageUnion({
  RequestedOpen: {
    projectId: Schema.String,
    status: Schema.optionalKey(IssueStatus),
  },
  RequestedClose: {},
})
export type InMessage = typeof InMessage.Type
