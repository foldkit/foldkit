import { Array, Effect, Option } from 'effect'
import { Block } from 'foldkit'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  message,
  story,
} from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { Comment } from '../domain/domain'
import {
  draftFromIssue,
  revisionFromIssue,
  savedIssueFromIssue,
} from '../domain/issue'
import { initialWorkspace } from '../domain/seed'
import { WorkspaceListbox } from '../listbox'
import { ApplicationLayer, RepositoryError } from '../services'
import { Message, OutMessage, SaveIssue, SaveState } from './issueDetail'
import { makeIssueDetailHost } from './issueDetail.fixture'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const { IssueDetailHostLive, path, send, issueDetail } =
  makeIssueDetailHost(issue)
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
  it.effect('initializes its draft from the issue', () =>
    story(
      IssueDetailHostLive,
      issueDetail(issueDetail => {
        expect(issueDetail.issueId).toBe(issue.id)
        expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
        expect(issueDetail.draft).toEqual(draftFromIssue(issue))
        expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
        expect(issueDetail.saveState).toEqual(SaveState.Idle())
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    ).pipe(Effect.provide(ApplicationLayer)),
  )

  it.effect(
    'ignores a malformed assignee selection without clearing the current assignee',
    () => {
      return story(
        IssueDetailHostLive,
        message(
          Block.deliver(
            WorkspaceListbox,
            [...path, 'assigneeListbox'],
            WorkspaceListbox.Message.RequestedSelectItem({
              item: 'not-an-assignee-selection',
            }),
          ),
        ),
        issueDetail(issueDetail => {
          expect(issueDetail.draft).toEqual(draftFromIssue(issue))
          expect(issueDetail.draft.maybeAssigneeId).toEqual(
            issue.maybeAssigneeId,
          )
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect('keeps draft edits local until the repository saves them', () => {
    const editedDescriptionDraft = modifyFields(editedDraft, {
      description: () => 'Include all active projects.',
    })

    return story(
      IssueDetailHostLive,
      send(Message.UpdatedTitle({ value: editedTitle })),
      send(
        Message.UpdatedDescription({ value: 'Include all active projects.' }),
      ),
      issueDetail(issueDetail => {
        expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
        expect(issueDetail.draft).toEqual(editedDescriptionDraft)
      }),
      expectNoOutMessage(),
      Command.expectNone(),
    ).pipe(Effect.provide(ApplicationLayer))
  })

  it.effect(
    'saves the draft with its original revision and emits the saved issue',
    () => {
      return story(
        IssueDetailHostLive,
        send(Message.UpdatedTitle({ value: editedTitle })),
        send(Message.RequestedSave()),
        Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            draft: editedDraft,
            expectedVersion: issue.version,
          }),
        ),
        issueDetail(issueDetail => {
          expect(issueDetail.saveState._tag).toBe('Saving')
          expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
        }),
        Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issue.version,
          }),
        ),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(
            revisionFromIssue(savedIssueSnapshot),
          )
          expect(issueDetail.draft).toEqual(draftFromIssue(savedIssueSnapshot))
          expect(issueDetail.saveState._tag).toBe('Idle')
        }),
        expectOutMessage(
          OutMessage.Saved({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          }),
        ),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect(
    'preserves every draft field after failure and retries the same revision',
    () => {
      return story(
        IssueDetailHostLive,
        send(Message.UpdatedTitle({ value: editedTitle })),
        send(Message.SubmittedIssueForm()),
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
        issueDetail(issueDetail => {
          expect(issueDetail.draft).toEqual(editedDraft)
          expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
          expect(issueDetail.saveState._tag).toBe('Failed')
        }),
        expectNoOutMessage(),
        send(Message.ClickedRetrySave()),
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
      ).pipe(Effect.provide(ApplicationLayer))
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
        IssueDetailHostLive,
        send(Message.UpdatedTitle({ value: editedTitle })),
        send(Message.RequestedSave()),
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
        send(Message.InformedOfIssueChange({ issue: compatibleIssue })),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(
            revisionFromIssue(compatibleIssue),
          )
          expect(issueDetail.draft).toEqual(editedDraft)
          expect(issueDetail.saveState).toEqual(SaveState.Failed({ error }))
          expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
        }),
        Command.expectNone(),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect(
    'refreshes a clean draft when the same issue has a newer revision',
    () => {
      return story(
        IssueDetailHostLive,
        send(Message.InformedOfIssueChange({ issue: newerIssue })),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(newerIssue))
          expect(issueDetail.draft).toEqual(draftFromIssue(newerIssue))
          expect(issueDetail.saveState._tag).toBe('Idle')
        }),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect(
    'reports a conflicting revision to the parent before accepting an issue update',
    () => {
      return story(
        IssueDetailHostLive,
        send(Message.UpdatedTitle({ value: editedTitle })),
        send(Message.RequestedSave()),
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
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
          expect(issueDetail.draft).toEqual(editedDraft)
          expect(issueDetail.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(newerIssue)),
          )
          expect(issueDetail.saveState).toEqual({
            _tag: 'Failed',
            error: 'This issue changed since you opened it.',
          })
        }),
        expectOutMessage(OutMessage.ReceivedIssue({ issue: newerIssue })),
        send(Message.InformedOfIssueChange({ issue: newerIssue })),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
          expect(issueDetail.draft).toEqual(editedDraft)
          expect(issueDetail.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(newerIssue)),
          )
        }),
        expectNoOutMessage(),
        Command.expectNone(),
      ).pipe(Effect.provide(ApplicationLayer))
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
      IssueDetailHostLive,
      send(Message.UpdatedTitle({ value: editedTitle })),
      send(Message.RequestedSave()),
      Command.expectExact(
        SaveIssue({
          issueId: issue.id,
          draft: editedDraft,
          expectedVersion: issue.version,
        }),
      ),
      send(
        Message.InformedOfIssueChange({ issue: issueWithConcurrentComment }),
      ),
      issueDetail(issueDetail => {
        expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
        expect(issueDetail.draft).toEqual(editedDraft)
        expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
        expect(issueDetail.saveState).toEqual(
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
      issueDetail(issueDetail => {
        expect(issueDetail.baseline).toEqual(
          revisionFromIssue(savedIssueWithConcurrentComment),
        )
        expect(issueDetail.saveState).toEqual(SaveState.Idle())
      }),
      expectOutMessage(
        OutMessage.Saved({
          savedIssue: savedIssueFromIssue(savedIssueWithConcurrentComment),
        }),
      ),
    ).pipe(Effect.provide(ApplicationLayer))
  })

  it.effect(
    'keeps a newer incoming revision when an older save completes',
    () => {
      const latestIssue = modifyFields(newerIssue, {
        version: () => savedIssueSnapshot.version + 1,
      })

      return story(
        IssueDetailHostLive,
        send(Message.UpdatedTitle({ value: editedTitle })),
        send(Message.RequestedSave()),
        send(Message.InformedOfIssueChange({ issue: latestIssue })),
        issueDetail(issueDetail => {
          expect(issueDetail.maybeIncomingRevision).toEqual(
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
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(latestIssue))
          expect(issueDetail.draft).toEqual(draftFromIssue(latestIssue))
          expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
          expect(issueDetail.saveState).toEqual(SaveState.Idle())
        }),
        expectOutMessage(
          OutMessage.Saved({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
          }),
        ),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect(
    'retains a dirty draft until the user reloads the latest revision',
    () => {
      return story(
        IssueDetailHostLive,
        send(Message.UpdatedTitle({ value: editedTitle })),
        send(Message.InformedOfIssueChange({ issue: newerIssue })),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
          expect(issueDetail.draft).toEqual(editedDraft)
          expect(issueDetail.maybeIncomingRevision).toEqual(
            Option.some(revisionFromIssue(newerIssue)),
          )
          expect(issueDetail.saveState._tag).toBe('Idle')
        }),
        send(Message.RequestedSave()),
        Command.expectNone(),
        send(Message.ClickedReloadIssue()),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(newerIssue))
          expect(issueDetail.draft).toEqual(draftFromIssue(newerIssue))
          expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
          expect(issueDetail.saveState._tag).toBe('Idle')
        }),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect(
    'ignores unrelated issues, older revisions, and completions without an active save',
    () => {
      const unrelatedIssue = modifyFields(newerIssue, {
        id: () => 'another-issue',
      })

      return story(
        IssueDetailHostLive,
        send(Message.InformedOfIssueChange({ issue: unrelatedIssue })),
        send(Message.InformedOfIssueChange({ issue })),
        send(
          Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issue.version,
          }),
        ),
        issueDetail(issueDetail => expect(issueDetail.issueId).toBe(issue.id)),
        issueDetail(issueDetail => {
          expect(issueDetail.baseline).toEqual(revisionFromIssue(issue))
          expect(issueDetail.draft).toEqual(draftFromIssue(issue))
          expect(issueDetail.maybeIncomingRevision).toEqual(Option.none())
          expect(issueDetail.saveState).toEqual(SaveState.Idle())
        }),
        expectNoOutMessage(),
      ).pipe(Effect.provide(ApplicationLayer))
    },
  )

  it.effect('closes without emitting unsaved draft data', () => {
    return story(
      IssueDetailHostLive,
      send(Message.UpdatedTitle({ value: editedTitle })),
      send(Message.ClickedClose()),
      expectOutMessage(OutMessage.Closed()),
      Command.expectNone(),
    ).pipe(Effect.provide(ApplicationLayer))
  })
})
