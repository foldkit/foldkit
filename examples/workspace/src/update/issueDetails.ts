import { Array, Option } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { IssueDetailBinding, applyIssueRevisionStep } from '../composition'
import { makeStep } from '../definition'
import type { Issue } from '../domain'

export const applyIncomingIssueStep = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    applyIssueRevisionStep(issue),
    IssueDetailBinding.informIssueChanged(issue.id, { issue }),
    IssueDetailBinding.requestReportDraft(issue.id),
  ])

export const reconcileRetainedIssueDetailsStep = makeStep(model => {
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
})
