import { Option, pipe } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeNoopStep, makeStep } from '../block'
import { MoveIssue } from '../command'
import { IssueBoardsBinding } from '../composition'
import { Issue, Workspace } from '../domain'
import type { FailedMoveIssue, SucceededMoveIssue } from '../message'
import { RepositoryError } from '../repository'
import { maybeConfirmedIssue } from '../selectors'
import { mergeIssue } from './issues'

export const moveIssue = (
  issueId: string,
  status: Issue.Status,
  insertionIndex: number,
) =>
  makeStep(model => {
    if (Issue.MoveState.guards.Moving(model.issueMoveState)) {
      return { model }
    }

    const maybeIssue = maybeConfirmedIssue(model, issueId)

    if (Option.isNone(maybeIssue)) {
      return { model }
    }

    const issue = maybeIssue.value

    return {
      model: modifyFields(model, {
        issueMoveState: () =>
          Issue.MoveState.Moving({
            issueId,
            status,
            insertionIndex,
            expectedVersion: issue.version,
          }),
      }),
      commands: [
        MoveIssue({
          issueId,
          status,
          insertionIndex,
          expectedVersion: issue.version,
        }),
      ],
    }
  })

const announceIssueMoveFailure = (issueId: string) =>
  makeStep(model =>
    pipe(
      maybeConfirmedIssue(model, issueId),
      Option.match({
        onNone: () => ({ model }),
        onSome: issue =>
          IssueBoardsBinding.informOfIssueMoveFailure(issue.projectId),
      }),
    ),
  )

export const handleSucceededMoveIssue = makeFieldsStep.fromMessage(
  ({ moveResult }: SucceededMoveIssue) => ({
    workspaceAsyncData: AsyncData.map(workspace =>
      Workspace.confirmIssueMove(workspace, moveResult),
    ),
    issueMoveState: () => Issue.MoveState.Idle(),
    maybeNotice: () => Option.some('Issue moved'),
  }),
)

export const handleFailedMoveIssue = makeStep.fromMessage(
  ({ issueId, status, insertionIndex, error }: FailedMoveIssue) => {
    const recordMoveFailure = makeFieldsStep(() => ({
      issueMoveState: () =>
        Issue.MoveState.Failed({
          issueId,
          status,
          insertionIndex,
          error: error.message,
        }),
    }))

    return RepositoryError.matchOrElse(
      error,
      {
        Conflict: ({ latestIssue }) =>
          Update.combineSteps([
            recordMoveFailure,
            mergeIssue(latestIssue),
            announceIssueMoveFailure(issueId),
          ]),
      },
      () =>
        Update.combineSteps([
          recordMoveFailure,
          announceIssueMoveFailure(issueId),
        ]),
    )
  },
)

export const retryIssueMove = makeStep(model =>
  Issue.MoveState.match(model.issueMoveState, {
    Idle: makeNoopStep,
    Moving: makeNoopStep,
    Failed: ({ issueId, status, insertionIndex }) =>
      moveIssue(issueId, status, insertionIndex),
  }),
)
