import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../domain'

export const InMessage = defineMessageUnion({
  RequestedSave: {},
  InformedOfIssueChange: { issue: Issue },
})
export type InMessage = typeof InMessage.Type
export type InformedOfIssueChange = typeof InMessage.InformedOfIssueChange.Type
