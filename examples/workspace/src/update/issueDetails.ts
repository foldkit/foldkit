import { Array } from 'effect'
import { Update } from 'foldkit'

import { IssueDetailBinding, applyIssueRevisionStep } from '../composition'
import { makeStep } from '../definition'
import type { Issue } from '../domain'

export const applyIncomingIssueStep = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    applyIssueRevisionStep(issue),
    IssueDetailBinding.informIssueChanged(issue.id, { issue }),
  ])

export const reconcileRetainedIssueDetailsStep = (
  issues: ReadonlyArray<typeof Issue.Type>,
) =>
  makeStep(() =>
    Update.combineSteps(
      Array.map(issues, issue =>
        IssueDetailBinding.informIssueChanged(issue.id, { issue }),
      ),
    ),
  )
