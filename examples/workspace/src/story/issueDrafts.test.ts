import { Array, Effect, Option } from 'effect'
import { Command, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'

import { describe, expect, it } from '@effect/vitest'

import { Message } from '../application'
import {
  type ResolvedModel,
  activeIssueDetail,
  application,
  commentComposerMessage,
  issueDetailMessage,
  loadWorkspace,
  retainedIssueDetail,
  startAt,
  teammateActivityMessage,
  unsavedIssueDrafts,
  url,
  visibleWorkspaceOf,
} from '../application.fixture'
import { Comment } from '../domain/domain'
import {
  draftFromIssue,
  mergeIssue,
  revisionFromIssue,
  savedIssueFromIssue,
} from '../domain/issue'
import { initialWorkspace } from '../domain/seed'
import { CommentComposer } from '../issueDetail/commentComposer'
import { AddComment } from '../issueDetail/commentComposer'
import { IssueDetail } from '../issueDetail/issueDetail'
import { SaveIssue } from '../issueDetail/issueDetail'
import { SaveState } from '../issueDetail/issueDetail'
import { issueRouter } from '../route'
import { TeammateActivity } from '../teammateActivity'

const issueA = Option.getOrThrow(Array.head(initialWorkspace.issues))
const issueB = Option.getOrThrow(Array.get(initialWorkspace.issues, 1))
const editedTitle = 'A retained issue title'
const commentBody = 'Keep this comment while I move around.'
const activeMemberId = 'maya'

const issuePath = (issueId: string) => issueRouter({ issueId })

const startAtIssue = (issueId = issueA.id) => startAt(issuePath(issueId))

const visibleIssue = (model: ResolvedModel, issueId = issueA.id) =>
  Option.getOrThrow(
    Array.findFirst(
      visibleWorkspaceOf(model).issues,
      issue => issue.id === issueId,
    ),
  )

const updatedTitle = (value = editedTitle) =>
  message(
    issueDetailMessage(issueA.id, IssueDetail.Message.UpdatedTitle({ value })),
  )

const updatedComment = (value = commentBody) =>
  message(
    commentComposerMessage(
      issueA.id,
      CommentComposer.Message.UpdatedBody({ value }),
    ),
  )

const submittedComment = message(
  commentComposerMessage(
    issueA.id,
    CommentComposer.Message.SubmittedCommentForm({
      authorId: activeMemberId,
    }),
  ),
)

const requestedSave = message(
  issueDetailMessage(issueA.id, IssueDetail.Message.RequestedSave()),
)

const changedUrlToIssue = (issueId: string) =>
  message(Message.ChangedUrl({ url: url(issuePath(issueId)) }))

const expectActiveMember = model((model: ResolvedModel) =>
  expect(model.memberSwitcher.activeMemberId).toBe(activeMemberId),
)

describe('Issue drafts', () => {
  it.effect(
    'retains field edits and clears the draft indicator when clean',
    () =>
      story(
        application,
        startAtIssue(),
        loadWorkspace,
        updatedTitle(),
        model(model => {
          expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
            issueId: issueA.id,
            commentComposer: { body: '' },
          })
          expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
            baseline: revisionFromIssue(issueA),
            draft: modifyFields(draftFromIssue(issueA), {
              title: () => editedTitle,
            }),
          })
          expect(unsavedIssueDrafts(model)).toEqual([
            { issueId: issueA.id, title: editedTitle },
          ])
        }),
        updatedTitle(issueA.title),
        model(model => expect(unsavedIssueDrafts(model)).toEqual([])),
      ),
  )

  it.effect('retains a comment by itself and alongside field edits', () =>
    story(
      application,
      startAtIssue(),
      loadWorkspace,
      updatedComment(),
      model(model => {
        expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
          issueId: issueA.id,
          commentComposer: { body: commentBody },
        })
        expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
          baseline: revisionFromIssue(issueA),
          draft: draftFromIssue(issueA),
        })
        expect(unsavedIssueDrafts(model)).toEqual([
          { issueId: issueA.id, title: issueA.title },
        ])
      }),
      updatedTitle(),
      model(model => {
        expect(retainedIssueDetail(model, issueA.id).draft.title).toBe(
          editedTitle,
        )
        expect(retainedIssueDetail(model, issueA.id).commentComposer.body).toBe(
          commentBody,
        )
      }),
      updatedComment(''),
      model(model =>
        expect(retainedIssueDetail(model, issueA.id).draft.title).toBe(
          editedTitle,
        ),
      ),
      updatedTitle(issueA.title),
      model(model => expect(unsavedIssueDrafts(model)).toEqual([])),
    ),
  )

  it.effect(
    'preserves an unsent comment after saving fields and clears a clean draft indicator',
    () =>
      Effect.gen(function* () {
        const savedIssueSnapshot = modifyFields(issueA, {
          title: () => editedTitle,
          version: version => version + 1,
        })

        const resolvedSave = Command.resolve(
          SaveIssue,
          IssueDetail.Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issueA.version,
          }),
        )

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedComment(),
          updatedTitle(),
          requestedSave,
          resolvedSave,
          model(model => {
            expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
              issueId: savedIssueSnapshot.id,
              commentComposer: { body: commentBody },
            })
            expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
              baseline: revisionFromIssue(savedIssueSnapshot),
              draft: draftFromIssue(savedIssueSnapshot),
            })
          }),
          Command.expectNone(),
        )

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedTitle(),
          requestedSave,
          resolvedSave,
          model(model => expect(unsavedIssueDrafts(model)).toEqual([])),
          Command.expectNone(),
        )
      }),
  )

  it.effect('rebases retained field edits after a comment succeeds', () => {
    const savedComment = Comment.make({
      id: 'comment-retained-draft',
      authorId: activeMemberId,
      body: commentBody,
      createdAt: '2026-10-23T12:00:00.000Z',
    })
    const issueWithComment = modifyFields(issueA, {
      comments: Array.append(savedComment),
    })

    return story(
      application,
      startAtIssue(),
      loadWorkspace,
      expectActiveMember,
      updatedTitle(),
      updatedComment(),
      submittedComment,
      Command.resolve(
        AddComment,
        CommentComposer.Message.SucceededAddComment({
          comment: Option.getOrThrow(Array.last(issueWithComment.comments)),
        }),
      ),
      model(model => {
        const issueDetail = activeIssueDetail(model)
        const issueEditor = activeIssueDetail(model)
        const retainedDetail = retainedIssueDetail(model, issueA.id)
        const retainedEditor = retainedIssueDetail(model, issueA.id)

        expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())
        expect(issueEditor.saveState._tag).toBe('Idle')
        expect(issueDetail.commentComposer.body).toBe('')

        expect(retainedEditor.baseline).toEqual(
          revisionFromIssue(issueWithComment),
        )
        expect(retainedEditor.draft.title).toBe(editedTitle)
        expect(retainedDetail.commentComposer.body).toBe('')
      }),
      Command.expectNone(),
    )
  })

  it.effect(
    'keeps the newest issue when save and comment successes arrive out of order',
    () => {
      const savedIssueSnapshot = modifyFields(issueA, {
        title: () => editedTitle,
        version: version => version + 1,
      })
      const savedComment = Comment.make({
        id: 'comment-after-save',
        authorId: activeMemberId,
        body: commentBody,
        createdAt: '2026-10-23T12:02:00.000Z',
      })
      const commentedIssue = modifyFields(savedIssueSnapshot, {
        comments: Array.append(savedComment),
      })

      return story(
        application,
        startAtIssue(),
        loadWorkspace,
        expectActiveMember,
        updatedTitle(),
        requestedSave,
        updatedComment(),
        submittedComment,
        model(model => {
          expect(activeIssueDetail(model).saveState).toEqual(
            SaveState.Saving({ expectedVersion: issueA.version }),
          )
          expect(activeIssueDetail(model).commentComposer).toMatchObject({
            body: commentBody,
            postState: { _tag: 'Posting' },
          })
        }),
        Command.resolve(
          AddComment,
          CommentComposer.Message.SucceededAddComment({
            comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
          }),
        ),
        model(model => {
          const issueEditor = activeIssueDetail(model)

          expect(issueEditor.saveState).toEqual({
            _tag: 'Saving',
            expectedVersion: issueA.version,
          })
          expect(issueEditor.baseline).toEqual(revisionFromIssue(issueA))
        }),
        Command.resolve(
          SaveIssue,
          IssueDetail.Message.SucceededSaveIssue({
            savedIssue: savedIssueFromIssue(savedIssueSnapshot),
            expectedVersion: issueA.version,
          }),
        ),
        model(model => {
          const issueEditor = activeIssueDetail(model)

          expect(issueEditor.baseline).toEqual(
            revisionFromIssue(commentedIssue),
          )
          expect(issueEditor.draft).toEqual(draftFromIssue(commentedIssue))
          expect(issueEditor.saveState._tag).toBe('Idle')
          expect(activeIssueDetail(model).commentComposer.body).toBe('')

          expect(visibleIssue(model)).toEqual(commentedIssue)
          expect(unsavedIssueDrafts(model)).toEqual([])
        }),
      )
    },
  )

  it.effect(
    'merges out-of-order comments without losing newer activity',
    () => {
      const activityComment = Comment.make({
        id: 'comment-newer-activity',
        authorId: 'jordan',
        body: 'This activity arrived after the pending comment was accepted.',
        createdAt: '2026-10-23T12:04:00.000Z',
      })
      const latestIssue = modifyFields(issueA, {
        comments: Array.append(activityComment),
      })

      const postedComment = Comment.make({
        id: 'comment-older-response',
        authorId: activeMemberId,
        body: commentBody,
        createdAt: '2026-10-23T12:03:00.000Z',
      })
      const olderCommentIssue = modifyFields(issueA, {
        comments: Array.append(postedComment),
      })

      return story(
        application,
        startAtIssue(),
        loadWorkspace,
        expectActiveMember,
        updatedComment(),
        submittedComment,
        model(model =>
          expect(activeIssueDetail(model).commentComposer).toMatchObject({
            body: commentBody,
            postState: { _tag: 'Posting' },
          }),
        ),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: latestIssue.id,
              comment: Option.getOrThrow(Array.last(latestIssue.comments)),
            }),
          ),
        ),
        Command.resolve(
          AddComment,
          CommentComposer.Message.SucceededAddComment({
            comment: Option.getOrThrow(Array.last(olderCommentIssue.comments)),
          }),
        ),
        model(model => {
          const issueEditor = activeIssueDetail(model)

          expect(issueEditor.baseline).toEqual(revisionFromIssue(latestIssue))
          expect(issueEditor.draft).toEqual(draftFromIssue(latestIssue))
          expect(activeIssueDetail(model).commentComposer.body).toBe('')

          expect(visibleIssue(model)).toEqual(
            mergeIssue(latestIssue, olderCommentIssue),
          )
          expect(unsavedIssueDrafts(model)).toEqual([])
        }),
      )
    },
  )

  it.effect(
    'preserves an unsent comment when shared issue data changes',
    () => {
      const activityComment = Comment.make({
        id: 'comment-observed-activity',
        authorId: 'jordan',
        body: 'An update from another teammate.',
        createdAt: '2026-10-23T12:05:00.000Z',
      })
      const observedIssue = modifyFields(issueA, {
        comments: Array.append(activityComment),
      })

      return story(
        application,
        startAtIssue(),
        loadWorkspace,
        updatedComment(),
        message(
          teammateActivityMessage(
            TeammateActivity.Message.SucceededAppendActivity({
              issueId: observedIssue.id,
              comment: Option.getOrThrow(Array.last(observedIssue.comments)),
            }),
          ),
        ),
        model(model => {
          const issueEditor = activeIssueDetail(model)

          expect(issueEditor.baseline).toEqual(revisionFromIssue(observedIssue))
          expect(issueEditor.draft).toEqual(draftFromIssue(observedIssue))
          expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())
          expect(activeIssueDetail(model).commentComposer.body).toBe(
            commentBody,
          )

          expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
            issueId: observedIssue.id,
            commentComposer: { body: commentBody },
          })
          expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
            baseline: revisionFromIssue(observedIssue),
            draft: draftFromIssue(observedIssue),
          })
        }),
        changedUrlToIssue(issueB.id),
        changedUrlToIssue(issueA.id),
        model(model => {
          const issueEditor = activeIssueDetail(model)

          expect(issueEditor.baseline).toEqual(revisionFromIssue(observedIssue))
          expect(issueEditor.draft).toEqual(draftFromIssue(observedIssue))
          expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())
          expect(activeIssueDetail(model).commentComposer.body).toBe(
            commentBody,
          )
        }),
      )
    },
  )

  it.effect('rebases dirty fields over a newer comment-only revision', () => {
    const activityComment = Comment.make({
      id: 'comment-field-rebase',
      authorId: 'jordan',
      body: 'The editable issue fields did not change.',
      createdAt: '2026-10-23T12:06:00.000Z',
    })
    const observedIssue = modifyFields(issueA, {
      comments: Array.append(activityComment),
    })

    return story(
      application,
      startAtIssue(),
      loadWorkspace,
      updatedTitle(),
      message(
        teammateActivityMessage(
          TeammateActivity.Message.SucceededAppendActivity({
            issueId: observedIssue.id,
            comment: Option.getOrThrow(Array.last(observedIssue.comments)),
          }),
        ),
      ),
      model(model => {
        const issueEditor = activeIssueDetail(model)
        const retainedEditor = retainedIssueDetail(model, issueA.id)

        expect(issueEditor.baseline).toEqual(revisionFromIssue(observedIssue))
        expect(issueEditor.draft.title).toBe(editedTitle)
        expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())
        expect(issueEditor.saveState._tag).toBe('Idle')

        expect(retainedEditor.baseline).toEqual(
          revisionFromIssue(observedIssue),
        )
        expect(retainedEditor.draft.title).toBe(editedTitle)
      }),
    )
  })

  it.effect(
    'reconciles retained state when reopening after compatible and conflicting changes',
    () =>
      Effect.gen(function* () {
        const activityComment = Comment.make({
          id: 'comment-closed-rebase',
          authorId: 'jordan',
          body: 'This arrived while the issue editor was closed.',
          createdAt: '2026-10-23T12:07:00.000Z',
        })
        const commentedIssue = modifyFields(issueA, {
          comments: Array.append(activityComment),
        })

        const renamedIssue = modifyFields(issueA, {
          title: () => 'Canonical title changed while the editor was closed',
          version: version => version + 1,
        })
        const renamedWorkspace = modifyFields(initialWorkspace, {
          issues: Array.map(issue =>
            issue.id === renamedIssue.id ? renamedIssue : issue,
          ),
        })

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedTitle(),
          updatedComment(),
          changedUrlToIssue(issueB.id),
          message(
            teammateActivityMessage(
              TeammateActivity.Message.SucceededAppendActivity({
                issueId: commentedIssue.id,
                comment: Option.getOrThrow(Array.last(commentedIssue.comments)),
              }),
            ),
          ),
          changedUrlToIssue(issueA.id),
          model(model => {
            const issueEditor = activeIssueDetail(model)

            expect(issueEditor.baseline).toEqual(
              revisionFromIssue(commentedIssue),
            )
            expect(issueEditor.draft.title).toBe(editedTitle)
            expect(activeIssueDetail(model).commentComposer.body).toBe(
              commentBody,
            )
            expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())
            expect(issueEditor.saveState._tag).toBe('Idle')
          }),
        )

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedComment(),
          changedUrlToIssue(issueB.id),
          message(
            Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
          ),
          changedUrlToIssue(issueA.id),
          model(model => {
            const issueEditor = activeIssueDetail(model)

            expect(issueEditor.baseline).toEqual(
              revisionFromIssue(renamedIssue),
            )
            expect(issueEditor.draft).toEqual(draftFromIssue(renamedIssue))
            expect(activeIssueDetail(model).commentComposer.body).toBe(
              commentBody,
            )
            expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())
            expect(issueEditor.saveState._tag).toBe('Idle')
          }),
        )

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedTitle(),
          updatedComment(),
          changedUrlToIssue(issueB.id),
          message(
            Message.SucceededLoadWorkspace({ workspace: renamedWorkspace }),
          ),
          changedUrlToIssue(issueA.id),
          model(model => {
            const issueEditor = activeIssueDetail(model)

            expect(issueEditor.baseline).toEqual(revisionFromIssue(issueA))
            expect(issueEditor.draft.title).toBe(editedTitle)
            expect(activeIssueDetail(model).commentComposer.body).toBe(
              commentBody,
            )
            expect(issueEditor.maybeIncomingRevision).toEqual(
              Option.some(revisionFromIssue(renamedIssue)),
            )
            expect(issueEditor.saveState).toEqual(SaveState.Idle())
          }),
        )
      }),
  )

  it.effect(
    'discarding or reloading field edits preserves an unsent comment',
    () =>
      Effect.gen(function* () {
        const newerIssue = modifyFields(issueA, {
          title: () => 'A newer canonical title',
          version: version => version + 1,
        })

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedComment(),
          updatedTitle(),
          message(
            issueDetailMessage(
              issueA.id,
              IssueDetail.Message.ClickedDiscardChanges(),
            ),
          ),
          model(model => {
            expect(activeIssueDetail(model).draft).toEqual(
              draftFromIssue(issueA),
            )
            expect(activeIssueDetail(model).commentComposer.body).toBe(
              commentBody,
            )

            expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
              issueId: issueA.id,
              commentComposer: { body: commentBody },
            })
            expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
              baseline: revisionFromIssue(issueA),
              draft: draftFromIssue(issueA),
            })
          }),
        )

        yield* story(
          application,
          startAtIssue(),
          loadWorkspace,
          updatedComment(),
          updatedTitle(),
          message(
            Message.SucceededLoadWorkspace({
              workspace: modifyFields(initialWorkspace, {
                issues: Array.map(issue =>
                  issue.id === newerIssue.id ? newerIssue : issue,
                ),
              }),
            }),
          ),
          message(
            issueDetailMessage(
              issueA.id,
              IssueDetail.Message.ClickedReloadIssue(),
            ),
          ),
          model(model => {
            const issueEditor = activeIssueDetail(model)

            expect(issueEditor.baseline).toEqual(revisionFromIssue(newerIssue))
            expect(issueEditor.draft).toEqual(draftFromIssue(newerIssue))
            expect(activeIssueDetail(model).commentComposer.body).toBe(
              commentBody,
            )
            expect(issueEditor.maybeIncomingRevision).toEqual(Option.none())

            expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
              issueId: newerIssue.id,
              commentComposer: { body: commentBody },
            })
            expect(retainedIssueDetail(model, issueA.id)).toMatchObject({
              baseline: revisionFromIssue(newerIssue),
              draft: draftFromIssue(newerIssue),
            })
          }),
        )
      }),
  )
})
