import { Array, type Result, Schema } from 'effect'

import { Issue, Workspace } from '../domain'
import type { RepositoryError } from './schema'

const FIRST_ISSUE_NUMBER = 101

export const RepositoryState = Schema.Struct({
  workspace: Workspace,
  nextIssueNumber: Schema.Number,
  nextCommentNumber: Schema.Number,
})

export type RepositoryTransition<Value> = Readonly<
  [
    Result.Result<Value, typeof RepositoryError.Type>,
    typeof RepositoryState.Type,
  ]
>

export const makeRepositoryState = (workspace: typeof Workspace.Type) =>
  RepositoryState.make({
    workspace,
    nextIssueNumber: FIRST_ISSUE_NUMBER + workspace.issues.length,
    nextCommentNumber:
      Array.reduce(
        workspace.issues,
        0,
        (commentCount, issue) => commentCount + issue.comments.length,
      ) + 1,
  })

export const findIssue = (
  state: typeof RepositoryState.Type,
  issueId: string,
) => Array.findFirst(state.workspace.issues, issue => issue.id === issueId)

export const hasProject = (
  state: typeof RepositoryState.Type,
  projectId: string,
) => Array.some(state.workspace.projects, project => project.id === projectId)

export const replaceIssue = (
  workspace: typeof Workspace.Type,
  issue: typeof Issue.Type,
) =>
  Workspace.make({
    ...workspace,
    issues: Array.map(workspace.issues, currentIssue =>
      currentIssue.id === issue.id ? issue : currentIssue,
    ),
  })

export const findAvailableIssueNumber = (
  state: typeof RepositoryState.Type,
): number => {
  let issueNumber = state.nextIssueNumber

  while (
    Array.some(
      state.workspace.issues,
      issue =>
        issue.id === `issue-${issueNumber}` ||
        issue.identifier === `WSP-${issueNumber}`,
    )
  ) {
    issueNumber += 1
  }

  return issueNumber
}

export const findAvailableCommentNumber = (
  state: typeof RepositoryState.Type,
): number => {
  let commentNumber = state.nextCommentNumber

  while (
    Array.some(state.workspace.issues, issue =>
      Array.some(
        issue.comments,
        comment => comment.id === `comment-${commentNumber}`,
      ),
    )
  ) {
    commentNumber += 1
  }

  return commentNumber
}
