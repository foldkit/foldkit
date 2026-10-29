import { Array, Option, pipe } from 'effect'
import { AsyncData } from 'foldkit'

import { IssueBoardBinding } from '../composition'
import { makeFieldsStep, makeStep } from '../definition'
import { type MovedIssue, applyMovedIssue } from '../domain'

export const applyMovedIssueStep = (movedIssue: MovedIssue) =>
  makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(workspace =>
      applyMovedIssue(workspace, movedIssue),
    ),
  }))

export const informBoardMoveFailureStep = (issueId: string) =>
  makeStep(model =>
    pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(workspace =>
        Array.findFirst(workspace.issues, issue => issue.id === issueId),
      ),
      Option.match({
        onNone: () => ({ model }),
        onSome: issue =>
          IssueBoardBinding.informIssueMoveFailed(issue.projectId),
      }),
    ),
  )
