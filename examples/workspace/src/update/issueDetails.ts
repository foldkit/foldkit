import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { IssueDetailBinding } from '../composition'
import { makeStep } from '../definition'
import type { Issue, SavedIssue } from '../domain'
import { applyIssueSnapshot, applySavedIssue } from '../steps'

export const informIssueChanged = (issueId: string) =>
  makeStep(model =>
    Option.match(
      Option.flatMap(AsyncData.getData(model.workspaceAsyncData), workspace =>
        Array.findFirst(workspace.issues, issue => issue.id === issueId),
      ),
      {
        onNone: () => ({ model }),
        onSome: issue =>
          IssueDetailBinding.informIssueChanged(issue.id, { issue }),
      },
    ),
  )

export const receiveIssueSnapshot = (issue: Issue) =>
  Update.combineSteps([applyIssueSnapshot(issue), informIssueChanged(issue.id)])

export const receiveSavedIssue = (savedIssue: SavedIssue) =>
  Update.combineSteps([
    applySavedIssue(savedIssue),
    informIssueChanged(savedIssue.issueId),
  ])

export const informRetainedIssueDetails = makeStep(model =>
  Option.match(AsyncData.getData(model.workspaceAsyncData), {
    onNone: () => ({ model }),
    onSome: workspace =>
      Update.combineSteps(
        Array.map(workspace.issues, issue =>
          IssueDetailBinding.informIssueChanged(issue.id, { issue }),
        ),
      ),
  }),
)
