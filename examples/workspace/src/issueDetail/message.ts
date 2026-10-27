import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue, SavedIssue } from '../domain'
import { RepositoryError } from '../repository'

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  ClickedRetrySave: {},
  ClickedReloadIssue: {},
  ClickedClose: {},
  ClickedDiscardChanges: {},
  RequestedSave: {},
  InformedOfIssueChange: { issue: Issue },
  SucceededSaveIssue: {
    savedIssue: SavedIssue,
    expectedVersion: Schema.Number,
  },
  FailedSaveIssue: {
    issueId: Schema.String,
    expectedVersion: Schema.Number,
    error: RepositoryError,
  },
})
