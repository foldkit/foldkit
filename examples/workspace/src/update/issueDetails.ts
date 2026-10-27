import { Array } from 'effect'
import { Update } from 'foldkit'

import { IssueDetailBinding, updateWorkspaceIssueStep } from '../composition'
import type { Issue } from '../domain'

export const updateIssueStep = (issue: typeof Issue.Type) =>
  Update.combineSteps([
    updateWorkspaceIssueStep(issue),
    IssueDetailBinding.informIssueChanged(issue.id, { issue }),
  ])

export const updateIssueDetailsStep = (
  issues: ReadonlyArray<typeof Issue.Type>,
) =>
  Update.combineSteps(
    Array.map(issues, issue =>
      IssueDetailBinding.informIssueChanged(issue.id, { issue }),
    ),
  )
