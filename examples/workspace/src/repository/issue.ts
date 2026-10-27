import { Array, Option, Result } from 'effect'

import {
  Comment,
  Issue,
  type IssueDraft,
  MovedIssue,
  SavedIssue,
  Workspace,
  placeIssue,
  revisionFromIssue,
} from '../domain'
import {
  type AddCommentInput,
  type MoveIssueInput,
  RepositoryError,
  type SaveIssueInput,
} from './schema'
import {
  type RepositoryState,
  type RepositoryTransition,
  findAvailableCommentNumber,
  findAvailableIssueNumber,
  findIssue,
  hasProject,
  replaceIssue,
} from './state'

export const saveIssueInState = (
  state: typeof RepositoryState.Type,
  input: typeof SaveIssueInput.Type,
): RepositoryTransition<typeof SavedIssue.Type> => {
  const maybeIssue = findIssue(state, input.issueId)

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

  if (!hasProject(state, input.draft.projectId)) {
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

  const nextIssue = Issue.make({
    ...issue,
    ...input.draft,
    version: issue.version + 1,
  })

  return [
    Result.succeed(
      SavedIssue.make({
        issueId: nextIssue.id,
        identifier: nextIssue.identifier,
        revision: revisionFromIssue(nextIssue),
      }),
    ),
    { ...state, workspace: replaceIssue(state.workspace, nextIssue) },
  ]
}

export const createIssueInState = (
  state: typeof RepositoryState.Type,
  draft: typeof IssueDraft.Type,
): RepositoryTransition<typeof Issue.Type> => {
  if (!hasProject(state, draft.projectId)) {
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
  const issue = Issue.make({
    ...draft,
    id: `issue-${issueNumber}`,
    identifier: `WSP-${issueNumber}`,
    version: 1,
    comments: [],
  })
  const nextWorkspace = Workspace.make({
    ...state.workspace,
    issues: Array.append(state.workspace.issues, issue),
  })

  return [
    Result.succeed(issue),
    { ...state, workspace: nextWorkspace, nextIssueNumber: issueNumber + 1 },
  ]
}

export const addCommentInState = (
  state: typeof RepositoryState.Type,
  input: typeof AddCommentInput.Type,
  createdAt: string,
): RepositoryTransition<typeof Comment.Type> => {
  const maybeIssue = findIssue(state, input.issueId)

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
  const comment = Comment.make({
    id: `comment-${commentNumber}`,
    authorId: input.authorId,
    body: input.body,
    createdAt,
  })
  const nextIssue = Issue.make({
    ...issue,
    comments: Array.append(issue.comments, comment),
  })

  return [
    Result.succeed(comment),
    {
      ...state,
      workspace: replaceIssue(state.workspace, nextIssue),
      nextCommentNumber: commentNumber + 1,
    },
  ]
}

export const moveIssueInState = (
  state: typeof RepositoryState.Type,
  input: typeof MoveIssueInput.Type,
): RepositoryTransition<typeof MovedIssue.Type> => {
  const maybeIssue = findIssue(state, input.issueId)

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

  const nextIssue = Issue.make({
    ...issue,
    status: input.status,
    version: issue.version + 1,
  })
  const nextWorkspace = Workspace.make({
    ...state.workspace,
    issues: placeIssue(state.workspace.issues, nextIssue, input.insertionIndex),
  })

  const targetIssues = Array.filter(
    nextWorkspace.issues,
    candidateIssue =>
      candidateIssue.projectId === nextIssue.projectId &&
      candidateIssue.status === nextIssue.status,
  )
  const insertionIndex = Option.getOrThrow(
    Array.findFirstIndex(
      targetIssues,
      candidateIssue => candidateIssue.id === nextIssue.id,
    ),
  )

  return [
    Result.succeed(
      MovedIssue.make({
        issueId: nextIssue.id,
        status: nextIssue.status,
        insertionIndex,
        version: nextIssue.version,
      }),
    ),
    { ...state, workspace: nextWorkspace },
  ]
}
