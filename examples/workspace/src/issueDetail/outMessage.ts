import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Comment, Issue, SavedIssue } from '../domain'

export const OutMessage = defineMessageUnion({
  Saved: { savedIssue: SavedIssue },
  AddedComment: { issueId: Schema.String, comment: Comment },
  ReceivedIssue: { issue: Issue },
  Closed: {},
})
export type OutMessage = typeof OutMessage.Type
