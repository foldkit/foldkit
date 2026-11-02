import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { IssueStatus } from '../domain'

export const InMessage = defineMessageUnion({
  InformedOfIssueMove: { status: IssueStatus, insertionIndex: Schema.Number },
  InformedOfIssueMoveFailure: {},
})
export type InMessage = typeof InMessage.Type
