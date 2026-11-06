import { Schema } from 'effect'
import { defineInMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const InMessage = defineInMessageUnion({
  RequestedOpen: {
    projectId: Schema.String,
    status: Schema.optionalKey(Issue.Status),
  },
  RequestedClose: {},
})
export type InMessage = typeof InMessage.Type
