import { type Option } from 'effect'

import { type Issue } from '../../domain'
import { IssueDetailComposition } from './composition'
import { saveIssue } from './steps'

export const inMessageUpdate =
  IssueDetailComposition.makeInMessageUpdate.withContext(
    (maybeIssue: Option.Option<Issue.Issue>) => ({
      RequestedSave: saveIssue(maybeIssue),
    }),
  )
