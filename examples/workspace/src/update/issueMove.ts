import { Array, Option, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { IssueBoardBinding } from '../composition'
import { ApplicationDefinition } from '../definition'
import {
  type Issue,
  type WorkspaceSnapshot,
  mergeIssue,
  placeIssueAt,
} from '../domain'
import { IssueMoveState } from '../model'

export const mergeIssues = (
  current: ReadonlyArray<typeof Issue.Type>,
  incoming: ReadonlyArray<typeof Issue.Type>,
) => [
  ...Array.map(incoming, issue =>
    Option.match(
      Array.findFirst(current, previous => previous.id === issue.id),
      {
        onNone: () => issue,
        onSome: previous => mergeIssue(previous, issue),
      },
    ),
  ),
  ...Array.filter(
    current,
    issue =>
      !Array.some(incoming, incomingIssue => incomingIssue.id === issue.id),
  ),
]

export const applyMovedIssues = (snapshot: typeof WorkspaceSnapshot.Type) =>
  ApplicationDefinition.makeFieldsStep(() => ({
    workspaceAsyncData: AsyncData.map(current =>
      modifyFields(current, {
        issues: issues => mergeIssues(issues, snapshot.issues),
      }),
    ),
  }))

export const rollbackMove = (issueId: string) =>
  ApplicationDefinition.makeFieldsStep(model => ({
    workspaceAsyncData: workspaceAsyncData => {
      if (
        !IssueMoveState.guards.MovingIssue(model.issueMoveState) ||
        model.issueMoveState.issueId !== issueId
      ) {
        return workspaceAsyncData
      }

      const { previousStatus, previousIndex, expectedVersion } =
        model.issueMoveState

      return AsyncData.map(workspaceAsyncData, snapshot =>
        modifyFields(snapshot, {
          issues: issues =>
            Option.match(
              Array.findFirst(issues, issue => issue.id === issueId),
              {
                onNone: () => issues,
                onSome: issue =>
                  placeIssueAt(
                    issues,
                    issue.version > expectedVersion
                      ? issue
                      : modifyFields(issue, { status: () => previousStatus }),
                    previousIndex,
                  ),
              },
            ),
        }),
      )
    },
  }))

export const informBoardMoveFailure = (issueId: string) =>
  ApplicationDefinition.makeStep(model =>
    pipe(
      AsyncData.getData(model.workspaceAsyncData),
      Option.flatMap(snapshot =>
        Array.findFirst(snapshot.issues, issue => issue.id === issueId),
      ),
      Option.match({
        onNone: () => ({ model }),
        onSome: issue =>
          IssueBoardBinding.informIssueMoveFailed(issue.projectId),
      }),
    ),
  )
