import { defineMessageUnion } from 'foldkit/message'

import { IssueStatus } from '../domain'

export const Message = defineMessageUnion({
  ClickedCreateIssue: { status: IssueStatus },
})
export type Message = typeof Message.Type
