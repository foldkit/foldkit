import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { IssueDetailBinding, applyIssueRevision } from '../composition'
import { ApplicationDefinition } from '../definition'
import type { Issue } from '../domain'

export const applyIncomingIssue = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    applyIssueRevision(issue),
    IssueDetailBinding.informIssueChanged(issue.id, { issue }),
    IssueDetailBinding.requestReportDraft(issue.id),
  ])

export const reconcileRetainedIssueDetails = ApplicationDefinition.makeStep(
  model => {
    const maybeSnapshot = AsyncData.getData(model.workspaceAsyncData)

    if (Option.isNone(maybeSnapshot)) {
      return { model }
    }

    const steps = Array.flatMap(model.issueDetailInstances, ({ issueId }) => {
      const maybeIssue = Array.findFirst(
        maybeSnapshot.value.issues,
        issue => issue.id === issueId,
      )

      return Option.match(maybeIssue, {
        onNone: () => [],
        onSome: issue => [
          IssueDetailBinding.informIssueChanged(issueId, { issue }),
          IssueDetailBinding.requestReportDraft(issueId),
        ],
      })
    })

    return Update.combineSteps(steps)
  },
)
