import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../domain'

export const Message = defineMessageUnion({
  UpdatedBody: { value: Schema.String },
  ClickedDiscardComment: {},
  SubmittedCommentForm: { authorId: Schema.String },
  SucceededAddComment: { issue: Issue },
  FailedAddComment: { error: Schema.String },
})
