import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Issue, IssueDraft, IssueStatus } from '../domain'

export const RepositoryOperation = Schema.Literals([
  'Load',
  'Save',
  'Create',
  'Comment',
  'Move',
  'Project',
])

export const RepositoryError = defineTaggedUnion({
  Unavailable: {
    message: Schema.String,
    operation: RepositoryOperation,
  },
  Conflict: {
    message: Schema.String,
    issueId: Schema.String,
    expectedVersion: Schema.Number,
    actualVersion: Schema.Number,
    latestIssue: Issue,
  },
  MissingIssue: { message: Schema.String, issueId: Schema.String },
  InvalidProject: { message: Schema.String, projectId: Schema.String },
})

export const SaveIssueInput = Schema.Struct({
  issueId: Schema.String,
  draft: IssueDraft,
  expectedVersion: Schema.Number,
})

export const AddCommentInput = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  authorId: Schema.String,
})

export const MoveIssueInput = Schema.Struct({
  issueId: Schema.String,
  status: IssueStatus,
  insertionIndex: Schema.Number,
  expectedVersion: Schema.Number,
})
