import { Option } from 'effect'

import type { Issue } from '../domain'
import { IssueDetailComposition } from './composition'
import { SaveState } from './definition'
import { draftFromIssue, revisionFromIssue } from './draft'

export const init = IssueDetailComposition.makeInit(
  (issue: typeof Issue.Type) => ({
    childInitContext: { issueId: issue.id },
    model: {
      issueId: issue.id,
      baseline: revisionFromIssue(issue),
      draft: draftFromIssue(issue),
      maybeIncomingRevision: Option.none(),
      saveState: SaveState.Idle(),
    },
  }),
)
