import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Comment } from '../domain'

export const Message = defineMessageUnion({
  UpdatedBody: { value: Schema.String },
  ClickedDiscardComment: {},
  SubmittedCommentForm: { authorId: Schema.String },
  SucceededAddComment: { comment: Comment },
  FailedAddComment: { error: Schema.String },
})
export type Message = typeof Message.Type
