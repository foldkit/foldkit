import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { IssueStatus } from '../domain'

export const Message = defineMessageUnion({
  ClickedCreateIssue: { status: IssueStatus },
  InformedOfIssueMove: { status: IssueStatus, insertionIndex: Schema.Number },
  InformedOfIssueMoveFailure: {},
})
export type Message = typeof Message.Type
