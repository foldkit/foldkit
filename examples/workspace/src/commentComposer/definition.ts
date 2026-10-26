import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { Issue } from '../domain'

export const PostState = defineTaggedUnion({
  Idle: {},
  Posting: {},
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  postState: PostState,
})

export const Message = defineMessageUnion({
  UpdatedBody: { value: Schema.String },
  ClickedDiscardComment: {},
  RequestedReportDraft: {},
  SubmittedCommentForm: { authorId: Schema.String },
  SucceededAddComment: { issue: Issue },
  FailedAddComment: { error: Schema.String },
})

export const OutMessage = defineMessageUnion({
  ReportedDraft: { body: Schema.String },
  AddedComment: { issue: Issue },
})

export const CommentComposerDefinition = Block.makeDefinition(
  'CommentComposer',
  {
    Model,
    Message,
    OutMessage,
  },
)

export const { makeOutMessageStep } = CommentComposerDefinition
