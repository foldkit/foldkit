import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { SavedIssue } from '../../domain'
import { RepositoryError } from '../../repository'

export const Message = defineMessageUnion({
  UpdatedTitle: { value: Schema.String },
  UpdatedDescription: { value: Schema.String },
  SubmittedIssueForm: {},
  ClickedRetrySave: {},
  ClickedReloadIssue: {},
  ClickedClose: {},
  ClickedDiscardChanges: {},
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
export type Message = typeof Message.Type
export type SucceededSaveIssue = typeof Message.SucceededSaveIssue.Type
export type FailedSaveIssue = typeof Message.FailedSaveIssue.Type
