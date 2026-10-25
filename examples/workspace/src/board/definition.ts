import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { DragAndDropBlock } from '@foldkit/ui'

import { IssueStatus } from '../domain'

export const Model = Schema.Struct({
  dragAndDrop: DragAndDropBlock.Model,
  announcement: Schema.String,
})

export const Message = defineMessageUnion({
  ClickedCreateIssue: { status: IssueStatus },
  InformedOfIssueMove: { status: IssueStatus, insertionIndex: Schema.Number },
  InformedOfIssueMoveFailure: {},
})

export const OutMessage = defineMessageUnion({
  RequestedCreation: { status: IssueStatus },
  RequestedMove: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
  },
})

export const IssueBoardDefinition = Block.makeDefinition('IssueBoard', {
  Model,
  Message,
  OutMessage,
})
