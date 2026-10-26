import { Option } from 'effect'

import { Issue, RetainedIssueDraft } from '../domain'
import { IssueDetailComposition } from './composition'
import { SaveState } from './definition'
import { draftFromIssue, reconcileIssue, revisionFromIssue } from './draft'

export const init = IssueDetailComposition.makeInit(
  (
    issue: typeof Issue.Type,
    maybeDraft: Option.Option<typeof RetainedIssueDraft.Type> = Option.none(),
  ) => {
    const retained = Option.filter(
      maybeDraft,
      draft => draft.issueId === issue.id,
    )

    const reconciled = reconcileIssue(
      {
        issueId: issue.id,
        baseline: Option.match(retained, {
          onNone: () => revisionFromIssue(issue),
          onSome: retained => retained.baseline,
        }),
        draft: Option.match(retained, {
          onNone: () => draftFromIssue(issue),
          onSome: retained => retained.draft,
        }),
        maybeIncomingRevision: Option.none(),
        saveState: SaveState.Idle(),
      },
      issue,
    )

    return {
      childInitContext: {
        issueId: issue.id,
        commentBody: Option.match(retained, {
          onNone: () => '',
          onSome: retained => retained.commentBody,
        }),
      },
      model: reconciled,
    }
  },
)
