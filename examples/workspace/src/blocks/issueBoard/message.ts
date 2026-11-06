import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const Message = defineMessageUnion({
  ClickedCreateIssue: { status: Issue.Status },
})
export type Message = typeof Message.Type
