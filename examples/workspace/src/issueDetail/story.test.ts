import { Array, Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import {
  Comment,
  draftFromIssue,
  initialWorkspace,
  revisionFromIssue,
  savedIssueFromIssue,
} from '../domain'
import { WorkspaceListboxBlock } from '../listbox'
import { RepositoryError } from '../repository'
import { SaveIssue } from './command'
import { AssigneeListboxBinding } from './composition'
import { init } from './init'
import { Message } from './message'
import { SaveState } from './model'
import { OutMessage } from './outMessage'
import { update } from './update'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const initialModel = init(issue).model
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
  test('ignores a malformed assignee selection without clearing the current assignee', () => {
    story(
      update,
      given(initialModel),
      message(
        toParentMessage(
          AssigneeListboxBinding,
          WorkspaceListboxBlock.Message.RequestedSelectItem({
            item: 'not-an-assignee-selection',
          }),
        ),
      ),
      model(model => {
        expect(model.draft).toBe(initialModel.draft)
        expect(model.draft.maybeAssigneeId).toEqual(issue.maybeAssigneeId)
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })

  test('keeps draft edits local until the repository saves them', () => {
    const editedDescriptionDraft = modifyFields(editedDraft, {
      description: () => 'Include all active projects.',
    })

    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(
        Message.UpdatedDescription({ value: 'Include all active projects.' }),
      ),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(issue))
        expect(model.draft).toEqual(editedDescriptionDraft)
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    )
  })

  test('saves the draft with its original revision and emits the saved issue', () => {
    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.RequestedSave()),
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
  })

  test('preserves every draft field after failure and retries the same revision', () => {
    story(
      update,
      given(initialModel),
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
  })

  test('keeps a save error visible when a compatible revision arrives', () => {
    const compatibleIssue = modifyFields(issue, {
      version: version => version + 1,
    })
    const error = 'The workspace is temporarily unavailable.'

    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.RequestedSave()),
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
      message(Message.InformedOfIssueChange({ issue: compatibleIssue })),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(compatibleIssue))
        expect(model.draft).toEqual(editedDraft)
        expect(model.saveState).toEqual(SaveState.Failed({ error }))
        expect(model.maybeIncomingRevision).toEqual(Option.none())
      }),
      Command.expectNone(),
    )
  })

  test('refreshes a clean draft when the same issue has a newer revision', () => {
    story(
      update,
      given(initialModel),
      message(Message.InformedOfIssueChange({ issue: newerIssue })),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(newerIssue))
        expect(model.draft).toEqual(draftFromIssue(newerIssue))
        expect(model.saveState._tag).toBe('Idle')
      }),
    )
  })

  test('reports a conflicting revision to the parent before accepting an issue update', () => {
    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.RequestedSave()),
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
      message(Message.InformedOfIssueChange({ issue: newerIssue })),
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
  })

  test('keeps a field save valid while comments arrive', () => {
    const issueWithConcurrentComment = modifyFields(issue, {
      comments: () => commentedIssue.comments,
    })
    const savedIssueWithConcurrentComment = modifyFields(savedIssueSnapshot, {
      comments: () => issueWithConcurrentComment.comments,
    })

    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.RequestedSave()),
      Command.expectExact(
        SaveIssue({
          issueId: issue.id,
          draft: editedDraft,
          expectedVersion: issue.version,
        }),
      ),
      message(
        Message.InformedOfIssueChange({ issue: issueWithConcurrentComment }),
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

  test('keeps a newer incoming revision when an older save completes', () => {
    const latestIssue = modifyFields(newerIssue, {
      version: () => savedIssueSnapshot.version + 1,
    })

    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.RequestedSave()),
      message(Message.InformedOfIssueChange({ issue: latestIssue })),
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
  })

  test('retains a dirty draft until the user reloads the latest revision', () => {
    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.InformedOfIssueChange({ issue: newerIssue })),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(issue))
        expect(model.draft).toEqual(editedDraft)
        expect(model.maybeIncomingRevision).toEqual(
          Option.some(revisionFromIssue(newerIssue)),
        )
        expect(model.saveState._tag).toBe('Idle')
      }),
      message(Message.RequestedSave()),
      Command.expectNone(),
      message(Message.ClickedReloadIssue()),
      model(model => {
        expect(model.baseline).toEqual(revisionFromIssue(newerIssue))
        expect(model.draft).toEqual(draftFromIssue(newerIssue))
        expect(model.maybeIncomingRevision).toEqual(Option.none())
        expect(model.saveState._tag).toBe('Idle')
      }),
    )
  })

  test('ignores unrelated issues, older revisions, and completions without an active save', () => {
    const unrelatedIssue = modifyFields(newerIssue, {
      id: () => 'another-issue',
    })

    story(
      update,
      given(initialModel),
      message(Message.InformedOfIssueChange({ issue: unrelatedIssue })),
      message(Message.InformedOfIssueChange({ issue })),
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

  test('closes without emitting unsaved draft data', () => {
    story(
      update,
      given(initialModel),
      message(Message.UpdatedTitle({ value: editedTitle })),
      message(Message.ClickedClose()),
      expectOutMessage(OutMessage.Closed()),
      Command.expectNone(),
    )
  })
})
