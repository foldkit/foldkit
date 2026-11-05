import { Array, Option, pipe } from 'effect'
import { AsyncData } from 'foldkit'

import { makeFieldsStep, makeStep } from '../block'
import { IssueBoardsBinding } from '../composition'
import {
  type MovedIssue,
  applyMovedIssue as applyMovedIssueToWorkspace,
} from '../domain'

export const applyMovedIssue = (movedIssue: MovedIssue) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(workspace =>
      applyMovedIssueToWorkspace(workspace, movedIssue),
    ),
  }))

export const informBoardMoveFailure = (issueId: string) =>
  makeStep(model =>
    pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(workspace =>
        Array.findFirst(workspace.issues, issue => issue.id === issueId),
      ),
      Option.match({
        onNone: () => ({ model }),
        onSome: issue =>
          IssueBoardsBinding.informIssueMoveFailure(issue.projectId),
      }),
    ),
  )
