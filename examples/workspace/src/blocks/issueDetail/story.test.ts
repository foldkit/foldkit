import { Array, Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Issue, initialWorkspace } from '../../domain'
import { StringListboxBlock } from '../../listbox'
import { RepositoryError } from '../../repository'
import { IssueDetailBlock } from './block'
import { SaveIssue } from './command'
import { AssigneeListboxBinding } from './composition'
import { InMessage } from './inMessage'
import { layer } from './layer'
import { Message } from './message'
import { SaveState } from './model'
import { OutMessage } from './outMessage'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issueDetailSubject = { block: IssueDetailBlock, layer }
const editedTitle = 'Search every project from the command menu'
const editedDraft = modifyFields(Issue.toDraft(issue), {
  title: () => editedTitle,
})
const savedIssue = modifyFields(issue, {
  title: () => editedTitle,
  version: version => version + 1,
})
const newerIssue = modifyFields(issue, {
  title: () => 'A title changed by another teammate',
  version: version => version + 1,
})
describe('Issue Detail', () => {
  it.effect(
    'ignores a malformed assignee selection without clearing the current assignee',
    () => {
      return Story.story(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Story.init(issue),
        Story.models(
          Story.steps(
            Story.messageIn(
              AssigneeListboxBinding,
              StringListboxBlock.Message.RequestedSelectItem({
                item: 'not-an-assignee-selection',
              }),
            ),
          ),
          (before, after) => expect(after.draft).toBe(before.draft),
        ),
        Story.model(model => {
          expect(model.draft.maybeAssigneeId).toEqual(issue.maybeAssigneeId)
        }),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect('keeps draft edits local until the repository saves them', () => {
    const editedDescriptionDraft = modifyFields(editedDraft, {
      description: () => 'Include all active projects.',
    })
    return Story.story(
      {
        ...issueDetailSubject,
        updateContext: [Option.some(issue)],
        inMessageContext: [Option.some(issue)],
      },
      Story.init(issue),
      Story.message(Message.UpdatedTitle({ value: editedTitle })),
      Story.message(
        Message.UpdatedDescription({
          value: 'Include all active projects.',
        }),
      ),
      Story.model(model => {
        expect(model.baselineRevision).toEqual(Issue.toRevision(issue))
        expect(model.draft).toEqual(editedDescriptionDraft)
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    )
  })

  it.effect(
    'saves the draft with its original revision and emits the saved issue',
    () => {
      return Story.story(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Story.init(issue),
        Story.message(Message.UpdatedTitle({ value: editedTitle })),
        Story.inMessage(InMessage.RequestedSave()),
        Story.Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            draft: editedDraft,
            expectedVersion: issue.version,
          }),
        ),
        Story.model(model => {
          expect(model.saveState._tag).toBe('Saving')
          expect(model.baselineRevision).toEqual(Issue.toRevision(issue))
        }),
        Story.Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            saveResult: Issue.toSaveResult(savedIssue),
            expectedVersion: issue.version,
          }),
        ),
        Story.model(model => {
          expect(model.baselineRevision).toEqual(Issue.toRevision(savedIssue))
          expect(model.draft).toEqual(Issue.toDraft(savedIssue))
          expect(model.saveState._tag).toBe('Idle')
        }),
        Story.expectOutMessage(
          OutMessage.Saved({
            saveResult: Issue.toSaveResult(savedIssue),
          }),
        ),
      )
    },
  )

  it.effect(
    'preserves every draft field after failure and retries the same revision',
    () => {
      return Story.story(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Story.init(issue),
        Story.message(Message.UpdatedTitle({ value: editedTitle })),
        Story.message(Message.SubmittedIssueForm()),
        Story.Command.resolve(
          SaveIssue,
          Message.FailedSaveIssue({
            issueId: issue.id,
            expectedVersion: issue.version,
            error: RepositoryError.Unavailable({
              message: 'The workspace is temporarily unavailable.',
              operation: 'SaveIssue',
            }),
          }),
        ),
        Story.model(model => {
          expect(model.draft).toEqual(editedDraft)
          expect(model.baselineRevision).toEqual(Issue.toRevision(issue))
          expect(model.saveState._tag).toBe('Failed')
        }),
        Story.expectNoOutMessage(),
        Story.message(Message.ClickedRetrySave()),
        Story.Command.expectExact(
          SaveIssue({
            issueId: issue.id,
            draft: editedDraft,
            expectedVersion: issue.version,
          }),
        ),
        Story.Command.resolve(
          SaveIssue,
          Message.SucceededSaveIssue({
            saveResult: Issue.toSaveResult(savedIssue),
            expectedVersion: issue.version,
          }),
        ),
        Story.expectOutMessage(
          OutMessage.Saved({
            saveResult: Issue.toSaveResult(savedIssue),
          }),
        ),
      )
    },
  )

  it.effect(
    'preserves the draft and reports the canonical issue after a conflict',
    () =>
      Story.story(
        {
          ...issueDetailSubject,
          updateContext: [Option.some(issue)],
          inMessageContext: [Option.some(issue)],
        },
        Story.init(issue),
        Story.message(Message.UpdatedTitle({ value: editedTitle })),
        Story.inMessage(InMessage.RequestedSave()),
        Story.Command.resolve(
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
        Story.model(model => {
          expect(model.baselineRevision).toEqual(Issue.toRevision(issue))
          expect(model.draft).toEqual(editedDraft)
          expect(model.saveState).toEqual(
            SaveState.Failed({
              error: 'This issue changed since you opened it.',
            }),
          )
        }),
        Story.expectOutMessage(
          OutMessage.DetectedSaveConflict({ latestIssue: newerIssue }),
        ),
        Story.Command.expectNone(),
      ),
  )

  it.effect('ignores a save completion from an older request', () =>
    Story.story(
      {
        ...issueDetailSubject,
        updateContext: [Option.some(issue)],
        inMessageContext: [Option.some(issue)],
      },
      Story.init(issue),
      Story.message(Message.UpdatedTitle({ value: editedTitle })),
      Story.inMessage(InMessage.RequestedSave()),
      Story.Command.expectExact(
        SaveIssue({
          issueId: issue.id,
          draft: editedDraft,
          expectedVersion: issue.version,
        }),
      ),
      Story.models(
        Story.steps(
          Story.Command.resolve(
            SaveIssue,
            Message.SucceededSaveIssue({
              saveResult: Issue.toSaveResult(savedIssue),
              expectedVersion: issue.version - 1,
            }),
          ),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.model(model => {
        expect(model.draft).toEqual(editedDraft)
        expect(model.saveState).toEqual(
          SaveState.Saving({ expectedVersion: issue.version }),
        )
      }),
      Story.expectNoOutMessage(),
    ),
  )

  it.effect('closes without emitting unsaved draft data', () => {
    return Story.story(
      {
        ...issueDetailSubject,
        updateContext: [Option.some(issue)],
        inMessageContext: [Option.some(issue)],
      },
      Story.init(issue),
      Story.message(Message.UpdatedTitle({ value: editedTitle })),
      Story.message(Message.ClickedClose()),
      Story.expectOutMessage(OutMessage.RequestedClose()),
      Story.Command.expectNone(),
    )
  })

  describe('when the confirmed Issue is unavailable', () => {
    const savingEditor = Story.story(
      {
        ...issueDetailSubject,
        updateContext: [Option.some(issue)],
        inMessageContext: [Option.some(issue)],
      },
      Story.init(issue),
    ).pipe(
      Effect.map(model =>
        modifyFields(model, {
          draft: () => editedDraft,
          saveState: () => SaveState.Saving({ expectedVersion: issue.version }),
        }),
      ),
    )

    it.effect('keeps text editable and allows the editor to close', () =>
      Story.story(
        {
          ...issueDetailSubject,
          updateContext: [Option.none()],
          inMessageContext: [Option.none()],
        },
        Story.init(issue),
        Story.message(Message.UpdatedTitle({ value: editedTitle })),
        Story.model(model => expect(model.draft).toEqual(editedDraft)),
        Story.message(Message.ClickedClose()),
        Story.expectOutMessage(OutMessage.RequestedClose()),
        Story.Command.expectNone(),
      ),
    )

    it.effect(
      'reports an unavailable Issue instead of saving or discarding the draft',
      () =>
        Story.story(
          {
            ...issueDetailSubject,
            updateContext: [Option.none()],
            inMessageContext: [Option.none()],
          },
          Story.init(issue),
          Story.message(Message.UpdatedTitle({ value: editedTitle })),
          Story.inMessage(InMessage.RequestedSave()),
          Story.model(model => {
            expect(model.draft).toEqual(editedDraft)
            expect(model.saveState).toEqual(
              SaveState.Failed({
                error: 'This issue is unavailable. Your draft has been kept.',
              }),
            )
          }),
          Story.message(Message.ClickedDiscardChanges()),
          Story.model(model => expect(model.draft).toEqual(editedDraft)),
          Story.Command.expectNone(),
        ),
    )

    it.effect(
      'settles a pending failure without needing the Issue snapshot',
      () =>
        Effect.gen(function* () {
          const model = yield* savingEditor

          return yield* Story.story(
            {
              ...issueDetailSubject,
              updateContext: [Option.none()],
              inMessageContext: [Option.none()],
            },
            Story.given(model),
            Story.message(
              Message.FailedSaveIssue({
                issueId: issue.id,
                expectedVersion: issue.version,
                error: RepositoryError.Unavailable({
                  operation: 'SaveIssue',
                  message: 'The save failed. Try again.',
                }),
              }),
            ),
            Story.model(model => {
              expect(model.draft).toEqual(editedDraft)
              expect(model.saveState).toEqual(
                SaveState.Failed({ error: 'The save failed. Try again.' }),
              )
            }),
            Story.Command.expectNone(),
          )
        }),
    )

    it.effect('settles a pending success from the returned revision', () =>
      Effect.gen(function* () {
        const model = yield* savingEditor

        return yield* Story.story(
          {
            ...issueDetailSubject,
            updateContext: [Option.none()],
            inMessageContext: [Option.none()],
          },
          Story.given(model),
          Story.message(
            Message.SucceededSaveIssue({
              saveResult: Issue.toSaveResult(savedIssue),
              expectedVersion: issue.version,
            }),
          ),
          Story.model(model => {
            expect(model.draft).toEqual(Issue.toDraft(savedIssue))
            expect(model.baselineRevision).toEqual(Issue.toRevision(savedIssue))
            expect(model.saveState).toEqual(SaveState.Idle())
          }),
          Story.expectOutMessage(
            OutMessage.Saved({ saveResult: Issue.toSaveResult(savedIssue) }),
          ),
          Story.Command.expectNone(),
        )
      }),
    )
  })
})
