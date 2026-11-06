import { type Issue } from '../../domain'
import { IssueDetailComposition } from './composition'
import { saveIssue } from './steps'

export const inMessageUpdate =
  IssueDetailComposition.makeInMessageUpdate.withContext(
    (issue: Issue.Issue) => ({
      RequestedSave: saveIssue(issue),
    }),
  )
