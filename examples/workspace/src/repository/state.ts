import { Array, type Result, Schema } from 'effect'

import { Issue, WorkspaceSnapshot } from '../domain'
import type { RepositoryError } from './schema'

const FIRST_ISSUE_NUMBER = 101

export const RepositoryState = Schema.Struct({
  snapshot: WorkspaceSnapshot,
  nextIssueNumber: Schema.Number,
  nextCommentNumber: Schema.Number,
})

export type RepositoryTransition<Value> = Readonly<
  [
    Result.Result<Value, typeof RepositoryError.Type>,
    typeof RepositoryState.Type,
  ]
>

export const makeRepositoryState = (snapshot: typeof WorkspaceSnapshot.Type) =>
  RepositoryState.make({
    snapshot,
    nextIssueNumber: FIRST_ISSUE_NUMBER + snapshot.issues.length,
    nextCommentNumber:
      Array.reduce(
        snapshot.issues,
        0,
        (count, issue) => count + issue.comments.length,
      ) + 1,
  })

export const findIssue = (
  state: typeof RepositoryState.Type,
  issueId: string,
) => Array.findFirst(state.snapshot.issues, issue => issue.id === issueId)

export const hasProject = (
  state: typeof RepositoryState.Type,
  projectId: string,
) => Array.some(state.snapshot.projects, project => project.id === projectId)

export const replaceIssue = (
  snapshot: typeof WorkspaceSnapshot.Type,
  issue: typeof Issue.Type,
) =>
  WorkspaceSnapshot.make({
    ...snapshot,
    issues: Array.map(snapshot.issues, currentIssue =>
      currentIssue.id === issue.id ? issue : currentIssue,
    ),
  })

export const findAvailableIssueNumber = (
  state: typeof RepositoryState.Type,
): number => {
  let issueNumber = state.nextIssueNumber

  while (
    Array.some(
      state.snapshot.issues,
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
    Array.some(state.snapshot.issues, issue =>
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
