import { Array, Option } from 'effect'
import {
  Command,
  type TestBlock,
  expectNoOutMessage,
  expectOutMessage,
  given,
  inMessage,
  init,
  message,
  messageFrom,
  model,
  story,
  withBlock,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import {
  Comment,
  draftFromIssue,
  initialWorkspace,
  revisionFromIssue,
  savedIssueFromIssue,
} from '../../domain'
import { WorkspaceListboxBlock } from '../../listbox'
import { RepositoryError } from '../../repository'
import { layer } from './block'
import { SaveIssue } from './command'
import { AssigneeListboxBinding } from './composition'
import { IssueDetailBlock } from './definition'
import { InMessage } from './inMessage'
import { Message } from './message'
import { SaveState } from './model'
import { OutMessage } from './outMessage'

const issueDetailSubject = { block: IssueDetailBlock, layer }

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const makeInitialModel = (executable: TestBlock<typeof issueDetailSubject>) => {
  const init = executable.init
  return init(issue).model
}
const editedTitle = 'Search every project from the command menu'
const editedDraft = modifyFields(draftFromIssue(issue), {
  title: () => editedTitle,
})
const savedIssueSnapshot = modifyFields(issue, {
  title: () => editedTitle,
  version: version => version + 1,
})
const newerIssue = modifyFields(issue, {
  title: () => 'A title changed by another teammate',
  version: version => version + 1,
})
const commentedIssue = modifyFields(issue, {
  comments: Array.append(
    Comment.make({
      id: 'comment-concurrent-save',
      authorId: 'jordan',
      body: 'This comment arrived while the issue was saving.',
      createdAt: '2026-10-23T12:08:00.000Z',
    }),
  ),
})

describe('Issue Detail', () => {
  it.effect(
    'ignores a malformed assignee selection without clearing the current assignee',
    () => {
      return withBlock(issueDetailSubject, executable => {
        const initialModel = makeInitialModel(executable)
        return story(
          issueDetailSubject,
          given(initialModel),
          messageFrom(
            AssigneeListboxBinding,
            WorkspaceListboxBlock.Message.RequestedSelectItem({
              item: 'not-an-assignee-selection',
            }),
          ),
          model(model => {
            expect(model.draft).toBe(initialModel.draft)
            expect(model.draft.maybeAssigneeId).toEqual(issue.maybeAssigneeId)
          }),
          expectNoOutMessage(),
          Command.expectNone(),
        )
      })
    },
  )

  it.effect('keeps draft edits local until the repository saves them', () => {
    const editedDescriptionDraft = modifyFields(editedDraft, {
      description: () => 'Include all active projects.',
    })
    return story(
      issueDetailSubject,
      init(issue),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(
        Message.UpdatedDescription({
          value: 'Include all active projects.',
        }),
      ),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(issue))
        expect(model.draft).toEqual(editedDescriptionDraft)
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })

  it.effect(
    'saves the draft with its original revision and emits the saved issue',
    () => {
      return story(
        issueDetailSubject,
        init(issue),
        message(Message.UpdatedTitle({ value: editedTitle })),
        inMessage(InMessage.RequestedSave()),
        Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            draft: editedDraft,
            expectedVersion: issue.version,
          }),
        ),
        model(model => {
          expect(model.saveState._tag).toBe('Saving')
          expect(model.baseline).toEqual(revisionFromIssue(issue))
        }),
        Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issue.version,
          }),
        ),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(savedIssueSnapshot))
          expect(model.draft).toEqual(draftFromIssue(savedIssueSnapshot))
          expect(model.saveState._tag).toBe('Idle')
        }),
        expectOutMessage(
          OutMessage.Saved({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          }),
        ),
      )
    },
  )

  it.effect(
    'preserves every draft field after failure and retries the same revision',
    () => {
      return story(
        issueDetailSubject,
        init(issue),
        message(Message.UpdatedTitle({ value: editedTitle })),
        message(Message.SubmittedIssueForm()),
        Command.resolve(
          SaveIssue,
          Message.FailedSaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            error: RepositoryError.Unavailable({
              message: 'The workspace is temporarily unavailable.',
              operation: 'Save',
            }),
          }),
        ),
        model(model => {
          expect(model.draft).toEqual(editedDraft)
          expect(model.baseline).toEqual(revisionFromIssue(issue))
          expect(model.saveState._tag).toBe('Failed')
        }),
        expectNoOutMessage(),
        message(Message.ClickedRetrySave()),
        Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            draft: editedDraft,
            expectedVersion: issue.version,
          }),
        ),
        Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issue.version,
          }),
        ),
        expectOutMessage(
          OutMessage.Saved({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          }),
        ),
      )
    },
  )

  it.effect(
    'keeps a save error visible when a compatible revision arrives',
    () => {
      const compatibleIssue = modifyFields(issue, {
        version: version => version + 1,
      })

      const error = 'The workspace is temporarily unavailable.'
      return story(
        issueDetailSubject,
        init(issue),
        message(Message.UpdatedTitle({ value: editedTitle })),
        inMessage(InMessage.RequestedSave()),
        Command.resolve(
          SaveIssue,
          Message.FailedSaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            error: RepositoryError.Unavailable({
              message: error,
              operation: 'Save',
            }),
          }),
        ),
        inMessage(InMessage.InformedOfIssueChange({ issue: compatibleIssue })),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(compatibleIssue))
          expect(model.draft).toEqual(editedDraft)
          expect(model.saveState).toEqual(SaveState.Failed({ error }))
          expect(model.maybeIncomingRevision).toEqual(Option.none())
        }),
        Command.expectNone(),
      )
    },
  )

  it.effect(
    'refreshes a clean draft when the same issue has a newer revision',
    () => {
      return story(
        issueDetailSubject,
        init(issue),
        inMessage(InMessage.InformedOfIssueChange({ issue: newerIssue })),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(newerIssue))
          expect(model.draft).toEqual(draftFromIssue(newerIssue))
          expect(model.saveState._tag).toBe('Idle')
        }),
      )
    },
  )

  it.effect(
    'reports a conflicting revision to the parent before accepting an issue update',
    () => {
      return story(
        issueDetailSubject,
        init(issue),
        message(Message.UpdatedTitle({ value: editedTitle })),
        inMessage(InMessage.RequestedSave()),
        Command.resolve(
          SaveIssue,
          Message.FailedSaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            error: RepositoryError.Conflict({
              message: 'This issue changed since you opened it.',
              issueId: issue.id,
              expectedVersion: issue.version,
              actualVersion: newerIssue.version,
              latestIssue: newerIssue,
            }),
          }),
        ),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(issue))
          expect(model.draft).toEqual(editedDraft)
          expect(model.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(newerIssue)),
          )
          expect(model.saveState).toEqual({
            _tag: 'Failed',
            error: 'This issue changed since you opened it.',
          })
        }),
        expectOutMessage(OutMessage.ReceivedIssue({ issue: newerIssue })),
        inMessage(InMessage.InformedOfIssueChange({ issue: newerIssue })),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(issue))
          expect(model.draft).toEqual(editedDraft)
          expect(model.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(newerIssue)),
          )
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      )
    },
  )

  it.effect('keeps a field save valid while comments arrive', () => {
    const issueWithConcurrentComment = modifyFields(issue, {
      comments: () => commentedIssue.comments,
    })

    const savedIssueWithConcurrentComment = modifyFields(savedIssueSnapshot, {
      comments: () => issueWithConcurrentComment.comments,
    })
    return story(
      issueDetailSubject,
      init(issue),
      message(Message.UpdatedTitle({ value: editedTitle })),
      inMessage(InMessage.RequestedSave()),
      Command.expectExact(
        SaveIssue({
          issueId: issue.id,
          draft: editedDraft,
          expectedVersion: issue.version,
        }),
      ),
      inMessage(
        InMessage.InformedOfIssueChange({
          issue: issueWithConcurrentComment,
        }),
      ),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(issue))
        expect(model.draft).toEqual(editedDraft)
        expect(model.maybeIncomingRevision).toEqual(Option.none())
        expect(model.saveState).toEqual(
          SaveState.Saving({ expectedVersion: issue.version }),
        )
      }),
      Command.expectExact(
        SaveIssue({
          issueId: issue.id,
          draft: editedDraft,
          expectedVersion: issue.version,
        }),
      ),
      Command.resolve(
        SaveIssue,
        Message.SucceededSaveIssue({
          savedIssue: savedIssueFromIssue(savedIssueWithConcurrentComment),
          expectedVersion: issue.version,
        }),
      ),
      model(model => {
        expect(model.baseline).toEqual(
          revisionFromIssue(savedIssueWithConcurrentComment),
        )
        expect(model.saveState).toEqual(SaveState.Idle())
      }),
      expectOutMessage(
        OutMessage.Saved({
          savedIssue: savedIssueFromIssue(savedIssueWithConcurrentComment),
        }),
      ),
    )
  })

  it.effect(
    'keeps a newer incoming revision when an older save completes',
    () => {
      const latestIssue = modifyFields(newerIssue, {
        version: () => savedIssueSnapshot.version + 1,
      })
      return story(
        issueDetailSubject,
        init(issue),
        message(Message.UpdatedTitle({ value: editedTitle })),
        inMessage(InMessage.RequestedSave()),
        inMessage(InMessage.InformedOfIssueChange({ issue: latestIssue })),
        model(model => {
          expect(model.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(latestIssue)),
          )
        }),
        Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issue.version,
          }),
        ),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(latestIssue))
          expect(model.draft).toEqual(draftFromIssue(latestIssue))
          expect(model.maybeIncomingRevision).toEqual(Option.none())
          expect(model.saveState).toEqual(SaveState.Idle())
        }),
        expectOutMessage(
          OutMessage.Saved({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          }),
        ),
      )
    },
  )

  it.effect(
    'retains a dirty draft until the user reloads the latest revision',
    () => {
      return story(
        issueDetailSubject,
        init(issue),
        message(Message.UpdatedTitle({ value: editedTitle })),
        inMessage(InMessage.InformedOfIssueChange({ issue: newerIssue })),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(issue))
          expect(model.draft).toEqual(editedDraft)
          expect(model.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(newerIssue)),
          )
          expect(model.saveState._tag).toBe('Idle')
        }),
        inMessage(InMessage.RequestedSave()),
        Command.expectNone(),
        message(Message.ClickedReloadIssue()),
        model(model => {
          expect(model.baseline).toEqual(revisionFromIssue(newerIssue))
          expect(model.draft).toEqual(draftFromIssue(newerIssue))
          expect(model.maybeIncomingRevision).toEqual(Option.none())
          expect(model.saveState._tag).toBe('Idle')
        }),
      )
    },
  )

  it.effect(
    'ignores unrelated issues, older revisions, and completions without an active save',
    () => {
      return withBlock(issueDetailSubject, executable => {
        const initialModel = makeInitialModel(executable)

        const unrelatedIssue = modifyFields(newerIssue, {
          id: () => 'another-issue',
        })
        return story(
          issueDetailSubject,
          given(initialModel),
          inMessage(InMessage.InformedOfIssueChange({ issue: unrelatedIssue })),
          inMessage(InMessage.InformedOfIssueChange({ issue })),
          message(
            Message.SucceededSaveIssue({
              savedIssue: savedIssueFromIssue(savedIssueSnapshot),
              expectedVersion: issue.version,
            }),
          ),
          model(model => {
            expect(model).toEqual(initialModel)
          }),
          expectNoOutMessage(),
        )
      })
    },
  )

  it.effect('closes without emitting unsaved draft data', () => {
    return story(
      issueDetailSubject,
      init(issue),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.ClickedClose()),
      expectOutMessage(OutMessage.Closed()),
      Command.expectNone(),
    )
  })
})
