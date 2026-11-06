import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const OutMessage = defineMessageUnion({
  Saved: { saveResult: Issue.SaveResult },
  AddedComment: { issueId: Schema.String, comment: Issue.Comment },
  DetectedSaveConflict: { latestIssue: Issue.Issue },
  RequestedClose: {},
})
export type OutMessage = typeof OutMessage.Type
