import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { MoveIssue } from '../command'
import { IssueBoardBinding } from '../composition'
import { makeStep } from '../definition'
import { type Issue, type IssueStatus } from '../domain'
import { IssueMoveState } from '../optimistic'

const beginIssueMoveStep = (
  issue: Issue,
  status: IssueStatus,
  insertionIndex: number,
) =>
  makeStep(model => ({
    model: modifyFields(model, {
      issueMoveState: () =>
        IssueMoveState.MovingIssue({
          issueId: issue.id,
          status,
          insertionIndex,
          expectedVersion: issue.version,
        }),
    }),
    commands: [
      MoveIssue({
        issueId: issue.id,
        status,
        insertionIndex,
        expectedVersion: issue.version,
      }),
    ],
  }))

export const requestIssueMoveStep = (
  issueId: string,
  status: IssueStatus,
  insertionIndex: number,
) =>
  makeStep(model => {
    if (IssueMoveState.guards.MovingIssue(model.issueMoveState)) {
      return { model }
    }

    return Option.match(AsyncData.getData(model.workspaceAsyncData), {
      onNone: () => ({ model }),
      onSome: workspace =>
        Option.match(
          Array.findFirst(workspace.issues, issue => issue.id === issueId),
          {
            onNone: () => ({ model }),
            onSome: issue =>
              Update.combineSteps([
                beginIssueMoveStep(issue, status, insertionIndex),
                IssueBoardBinding.informIssueMoved(issue.projectId, {
                  status,
                  insertionIndex,
                }),
              ]),
          },
        ),
    })
  })
