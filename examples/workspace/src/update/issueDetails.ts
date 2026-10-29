import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { IssueDetailBinding } from '../composition'
import { makeStep } from '../definition'
import type { Issue, SavedIssue } from '../domain'
import { applyIssueSnapshotStep, applySavedIssueStep } from '../steps'

export const informIssueChangedStep = (issueId: string) =>
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

export const receiveIssueSnapshotStep = (issue: Issue) =>
  Update.combineSteps([
    applyIssueSnapshotStep(issue),
    informIssueChangedStep(issue.id),
  ])

export const receiveSavedIssueStep = (savedIssue: SavedIssue) =>
  Update.combineSteps([
    applySavedIssueStep(savedIssue),
    informIssueChangedStep(savedIssue.issueId),
  ])

export const informRetainedIssueDetailsStep = makeStep(model =>
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
