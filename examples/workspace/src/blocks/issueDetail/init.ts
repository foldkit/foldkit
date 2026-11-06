import { Issue } from '../../domain'
import { IssueDetailComposition } from './composition'
import { SaveState } from './model'

export const init = IssueDetailComposition.makeInit((issue: Issue.Issue) => ({
  childInitContext: { issueId: issue.id },
  model: {
    issueId: issue.id,
    baselineRevision: Issue.toRevision(issue),
    draft: Issue.toDraft(issue),
    saveState: SaveState.Idle(),
  },
}))
