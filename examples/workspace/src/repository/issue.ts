import { Array, Option, Result } from 'effect'

import { Issue, Workspace } from '../domain'
import {
  type AddIssueCommentInput,
  type MoveIssueInput,
  RepositoryError,
  type SaveIssueInput,
} from './schema'
import {
  type RepositoryState,
  type RepositoryTransition,
  findAvailableCommentNumber,
  findAvailableIssueNumber,
} from './state'

export const saveIssueInState = (
  state: RepositoryState,
  input: SaveIssueInput,
): RepositoryTransition<Issue.SaveResult> => {
  const maybeIssue = Workspace.findIssue(state.workspace, input.issueId)

  if (Option.isNone(maybeIssue)) {
    return [
      Result.fail(
        RepositoryError.MissingIssue({
          message: 'This issue could not be found.',
          issueId: input.issueId,
        }),
      ),
      state,
    ]
  }

  const issue = maybeIssue.value

  if (issue.version !== input.expectedVersion) {
    return [
      Result.fail(
        RepositoryError.Conflict({
          message:
            'This issue changed since you opened it. Reload the latest version before saving.',
          issueId: issue.id,
          expectedVersion: input.expectedVersion,
          actualVersion: issue.version,
          latestIssue: issue,
        }),
      ),
      state,
    ]
  }

  if (
    Option.isNone(Workspace.findProject(state.workspace, input.draft.projectId))
  ) {
    return [
      Result.fail(
        RepositoryError.InvalidProject({
          message: 'Choose a project in this workspace.',
          projectId: input.draft.projectId,
        }),
      ),
      state,
    ]
  }

  const nextIssue = Issue.Issue.make({
    ...issue,
    ...input.draft,
    version: issue.version + 1,
  })

  return [
    Result.succeed(Issue.toSaveResult(nextIssue)),
    { ...state, workspace: Workspace.replaceIssue(state.workspace, nextIssue) },
  ]
}

export const createIssueInState = (
  state: RepositoryState,
  draft: Issue.Draft,
): RepositoryTransition<Issue.Issue> => {
  if (Option.isNone(Workspace.findProject(state.workspace, draft.projectId))) {
    return [
      Result.fail(
        RepositoryError.InvalidProject({
          message: 'Choose a project in this workspace.',
          projectId: draft.projectId,
        }),
      ),
      state,
    ]
  }

  const issueNumber = findAvailableIssueNumber(state)
  const issue = Issue.Issue.make({
    ...draft,
    id: `issue-${issueNumber}`,
    identifier: `WSP-${issueNumber}`,
    version: 1,
    comments: [],
  })
  const nextWorkspace = Workspace.Workspace.make({
    ...state.workspace,
    issues: Array.append(state.workspace.issues, issue),
  })

  return [
    Result.succeed(issue),
    { ...state, workspace: nextWorkspace, nextIssueNumber: issueNumber + 1 },
  ]
}

export const addIssueCommentInState = (
  state: RepositoryState,
  input: AddIssueCommentInput,
  createdAt: string,
): RepositoryTransition<Issue.Comment> => {
  const maybeIssue = Workspace.findIssue(state.workspace, input.issueId)

  if (Option.isNone(maybeIssue)) {
    return [
      Result.fail(
        RepositoryError.MissingIssue({
          message: 'This issue could not be found.',
          issueId: input.issueId,
        }),
      ),
      state,
    ]
  }

  const commentNumber = findAvailableCommentNumber(state)
  const issue = maybeIssue.value
  const comment = Issue.Comment.make({
    id: `comment-${commentNumber}`,
    authorId: input.authorId,
    body: input.body,
    createdAt,
  })
  const nextIssue = Issue.Issue.make({
    ...issue,
    comments: Array.append(issue.comments, comment),
  })

  return [
    Result.succeed(comment),
    {
      ...state,
      workspace: Workspace.replaceIssue(state.workspace, nextIssue),
      nextCommentNumber: commentNumber + 1,
    },
  ]
}

export const moveIssueInState = (
  state: RepositoryState,
  input: MoveIssueInput,
): RepositoryTransition<Issue.MoveResult> => {
  const maybeIssue = Workspace.findIssue(state.workspace, input.issueId)

  if (Option.isNone(maybeIssue)) {
    return [
      Result.fail(
        RepositoryError.MissingIssue({
          issueId: input.issueId,
          message: 'This issue could not be found.',
        }),
      ),
      state,
    ]
  }

  const issue = maybeIssue.value

  if (issue.version !== input.expectedVersion) {
    return [
      Result.fail(
        RepositoryError.Conflict({
          issueId: issue.id,
          expectedVersion: input.expectedVersion,
          actualVersion: issue.version,
          latestIssue: issue,
          message:
            'The issue changed before it could be moved. Review it and retry.',
        }),
      ),
      state,
    ]
  }

  const nextIssue = Issue.Issue.make({
    ...issue,
    status: input.status,
    version: issue.version + 1,
  })
  const issuePlacement = Issue.place(
    state.workspace.issues,
    nextIssue,
    input.insertionIndex,
  )
  const nextWorkspace = Workspace.Workspace.make({
    ...state.workspace,
    issues: issuePlacement.issues,
  })

  return [
    Result.succeed(
      Issue.MoveResult.make({
        issueId: nextIssue.id,
        status: nextIssue.status,
        insertionIndex: issuePlacement.insertionIndex,
        version: nextIssue.version,
      }),
    ),
    { ...state, workspace: nextWorkspace },
  ]
}
