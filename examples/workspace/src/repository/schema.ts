import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Issue } from '../domain'

export const RepositoryOperation = Schema.Literals([
  'LoadWorkspace',
  'SaveIssue',
  'CreateIssue',
  'AddIssueComment',
  'MoveIssue',
  'SaveProject',
])
export type RepositoryOperation = typeof RepositoryOperation.Type

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
    latestIssue: Issue.Issue,
  },
  MissingIssue: { message: Schema.String, issueId: Schema.String },
  InvalidProject: { message: Schema.String, projectId: Schema.String },
})
export type RepositoryError = typeof RepositoryError.Type

export const SaveIssueInput = Schema.Struct({
  issueId: Schema.String,
  draft: Issue.Draft,
  expectedVersion: Schema.Number,
})
export type SaveIssueInput = typeof SaveIssueInput.Type

export const AddIssueCommentInput = Schema.Struct({
  issueId: Schema.String,
  body: Schema.String,
  authorId: Schema.String,
})
export type AddIssueCommentInput = typeof AddIssueCommentInput.Type

export const MoveIssueInput = Schema.Struct({
  issueId: Schema.String,
  status: Issue.Status,
  insertionIndex: Schema.Number,
  expectedVersion: Schema.Number,
})
export type MoveIssueInput = typeof MoveIssueInput.Type
