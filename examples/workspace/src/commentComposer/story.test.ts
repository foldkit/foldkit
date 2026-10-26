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
import { describe, expect, test } from 'vitest'

import { Comment, Issue, initialSnapshot } from '../domain'
import { AddComment } from './command'
import { Message, Model, OutMessage, PostState } from './definition'
import { init } from './init'
import { update } from './update'

const issue = Option.getOrThrow(Array.head(initialSnapshot.issues))

describe('CommentComposerBlock update', () => {
  test('reports its retained draft through the public operation', () => {
    const body = 'Keep this comment available.'

    story(
      update,
      given(init(issue.id, body).model),
      message(Message.RequestedReportDraft()),
      expectOutMessage(OutMessage.ReportedDraft({ body })),
      model(model => {
        expect(model.body).toBe(body)
      }),
      Command.expectNone(),
    )
  })

  test('reports accepted edits and discards an idle draft', () => {
    const body = 'This draft changed.'

    story(
      update,
      given(init(issue.id).model),
      message(Message.UpdatedBody({ value: body })),
      expectOutMessage(OutMessage.ReportedDraft({ body })),
      message(Message.ClickedDiscardComment()),
      expectOutMessage(OutMessage.ReportedDraft({ body: '' })),
      model(model => {
        expect(model.body).toBe('')
        expect(model.postState).toEqual(PostState.Idle())
      }),
      Command.expectNone(),
    )
  })

  test('keeps a posting draft locked without reporting ignored edits', () => {
    const body = 'The submitted comment.'
    const posting = Model.make({
      issueId: issue.id,
      body,
      postState: PostState.Posting(),
    })

    story(
      update,
      given(posting),
      message(Message.UpdatedBody({ value: 'An edit during posting.' })),
      expectNoOutMessage(),
      model(model => expect(model).toBe(posting)),
      message(Message.ClickedDiscardComment()),
      expectNoOutMessage(),
      model(model => expect(model).toBe(posting)),
      message(Message.SubmittedCommentForm({ authorId: 'alex' })),
      expectNoOutMessage(),
      model(model => expect(model).toBe(posting)),
      Command.expectNone(),
      message(Message.RequestedReportDraft()),
      expectOutMessage(OutMessage.ReportedDraft({ body })),
      Command.expectNone(),
    )
  })

  test.each([PostState.Idle(), PostState.Failed({ error: 'Try again.' })])(
    'ignores post completions while $_tag',
    postState => {
      const current = Model.make({
        issueId: issue.id,
        body: 'Keep this draft.',
        postState,
      })

      story(
        update,
        given(current),
        message(Message.SucceededAddComment({ issue })),
        expectNoOutMessage(),
        model(model => expect(model).toBe(current)),
        message(Message.FailedAddComment({ error: 'A late failure.' })),
        expectNoOutMessage(),
        model(model => expect(model).toBe(current)),
        Command.expectNone(),
      )
    },
  )

  test('retains a failed post and emits the issue after retry', () => {
    const body = 'Ready for review.'
    const comment = Comment.make({
      id: 'comment-retry',
      authorId: 'maya',
      body,
      createdAt: '2026-10-24T15:00:00.000Z',
    })
    const updatedIssue = Issue.make({
      ...issue,
      version: issue.version + 1,
      comments: [...issue.comments, comment],
    })
    const error = 'The workspace is temporarily unavailable.'

    story(
      update,
      given(init(issue.id, `  ${body}  `).model),
      message(Message.SubmittedCommentForm({ authorId: 'maya' })),
      Command.expectExact(
        AddComment({ issueId: issue.id, body, authorId: 'maya' }),
      ),
      Command.resolve(AddComment, Message.FailedAddComment({ error })),
      expectNoOutMessage(),
      model(model => {
        expect(model.body).toBe(`  ${body}  `)
        expect(model.postState).toEqual(PostState.Failed({ error }))
      }),
      message(Message.SubmittedCommentForm({ authorId: 'maya' })),
      Command.expectExact(
        AddComment({ issueId: issue.id, body, authorId: 'maya' }),
      ),
      Command.resolve(
        AddComment,
        Message.SucceededAddComment({ issue: updatedIssue }),
      ),
      expectOutMessage(OutMessage.AddedComment({ issue: updatedIssue })),
      model(model => {
        expect(model.body).toBe('')
        expect(model.postState).toEqual(PostState.Idle())
      }),
      Command.expectNone(),
    )
  })
})
