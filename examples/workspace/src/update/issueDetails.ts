import { Array, Option, Record } from 'effect'
import { AsyncData, Update } from 'foldkit'

import { IssueDetailBinding, applyIssueRevisionStep } from '../composition'
import { makeStep } from '../definition'
import type { Issue } from '../domain'

export const applyIncomingIssueStep = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    applyIssueRevisionStep(issue),
    IssueDetailBinding.informIssueChanged(issue.id, { issue }),
  ])

export const reconcileRetainedIssueDetailsStep = makeStep(model => {
  const maybeSnapshot = AsyncData.getData(model.workspaceAsyncData)

  if (Option.isNone(maybeSnapshot)) {
    return { model }
  }

  const steps = Array.flatMap(Record.keys(model.issueDetails), issueId => {
    const maybeIssue = Array.findFirst(
      maybeSnapshot.value.issues,
      issue => issue.id === issueId,
    )

    return Option.match(maybeIssue, {
      onNone: () => [],
      onSome: issue => [
        IssueDetailBinding.informIssueChanged(issueId, { issue }),
      ],
    })
  })

  return Update.combineSteps(steps)
})
