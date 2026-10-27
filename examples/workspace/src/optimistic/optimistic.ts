import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { IssueStatus, type Workspace, moveIssue } from '../domain'

export const IssueMoveState = defineTaggedUnion({
  Idle: {},
  MovingIssue: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    expectedVersion: Schema.Number,
  },
  FailedMove: {
    issueId: Schema.String,
    status: IssueStatus,
    insertionIndex: Schema.Number,
    error: Schema.String,
  },
})

export const workspaceWithPendingMove = (
  workspace: typeof Workspace.Type,
  issueMoveState: typeof IssueMoveState.Type,
) =>
  IssueMoveState.matchOrElse(
    issueMoveState,
    {
      MovingIssue: ({ issueId, status, insertionIndex }) =>
        modifyFields(workspace, {
          issues: issues => moveIssue(issues, issueId, status, insertionIndex),
        }),
    },
    () => workspace,
  )
