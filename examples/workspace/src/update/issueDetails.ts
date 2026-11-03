import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { IssueDetailsBinding } from '../composition'
import { makeStep } from '../definition'
import type { Issue, SavedIssue } from '../domain'
import { applyIssueSnapshot, applySavedIssue } from '../steps'

export const informIssueChange = (issueId: string) =>
  makeStep(model =>
    Option.match(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), workspace =>
        Array.findFirst(workspace.issues, issue => issue.id === issueId),
      ),
      {
        onNone: () => ({ model }),
        onSome: issue =>
          IssueDetailsBinding.informIssueChange(issue.id, { issue }),
      },
    ),
  )

export const receiveIssueSnapshot = (issue: Issue) =>
  Update.combineSteps([applyIssueSnapshot(issue), informIssueChange(issue.id)])

export const receiveSavedIssue = (savedIssue: SavedIssue) =>
  Update.combineSteps([
    applySavedIssue(savedIssue),
    informIssueChange(savedIssue.issueId),
  ])

export const informRetainedIssueDetails = makeStep(model =>
  Option.match(AsyncData.getData(model.workspaceAsyncData), {
    onNone: () => ({ model }),
    onSome: workspace =>
      Update.combineSteps(
        Array.map(workspace.issues, issue =>
          IssueDetailsBinding.informIssueChange(issue.id, { issue }),
        ),
      ),
  }),
)
