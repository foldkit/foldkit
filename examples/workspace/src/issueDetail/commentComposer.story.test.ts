import { Array, Effect, Option } from 'effect'
import {
  Command,
  expectNoOutMessage,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

import { Comment } from '../domain/domain'
import { initialWorkspace } from '../domain/seed'
import { WorkspaceRepositoryLayer } from '../services'
import {
  AddComment,
  CommentComposerLive,
  Message,
  Model,
  OutMessage,
  PostState,
} from './commentComposer'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const existingComment = Option.getOrThrow(Array.head(issue.comments))
const args = { issueId: issue.id }

describe('CommentComposer update', () => {
  it.effect('keeps edits local and discards an idle draft', () => {
    const body = 'This draft changed.'

    return story(
      CommentComposerLive,
      args,
      message(Message.UpdatedBody({ value: body })),
      expectNoOutMessage(),
      model(model => expect(model.body).toBe(body)),
      message(Message.ClickedDiscardComment()),
      expectNoOutMessage(),
      model(model => {
        expect(model.body).toBe('')
        expect(model.postState).toEqual(PostState.Idle())
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })

  it.effect('keeps a posting draft locked', () => {
    const body = 'The submitted comment.'
    const postingModel = Model.make({
      issueId: issue.id,
      body,
      postState: PostState.Posting(),
    })

    return story(
      CommentComposerLive,
      args,
      given(postingModel),
      message(Message.UpdatedBody({ value: 'An edit during posting.' })),
      expectNoOutMessage(),
      model(model => expect(model).toBe(postingModel)),
      message(Message.ClickedDiscardComment()),
      expectNoOutMessage(),
      model(model => expect(model).toBe(postingModel)),
      message(Message.SubmittedCommentForm({ authorId: 'alex' })),
      expectNoOutMessage(),
      model(model => expect(model).toBe(postingModel)),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })

  it.effect.each([PostState.Idle(), PostState.Failed({ error: 'Try again.' })])(
    'ignores post completions while $_tag',
    postState => {
      const currentModel = Model.make({
        issueId: issue.id,
        body: 'Keep this draft.',
        postState,
      })

      return story(
        CommentComposerLive,
        args,
        given(currentModel),
        message(Message.SucceededAddComment({ comment: existingComment })),
        expectNoOutMessage(),
        model(model => expect(model).toBe(currentModel)),
        message(Message.FailedAddComment({ error: 'A late failure.' })),
        expectNoOutMessage(),
        model(model => expect(model).toBe(currentModel)),
        Command.expectNone(),
      ).pipe(Effect.provide(WorkspaceRepositoryLayer))
    },
  )

  it.effect('retains a failed post and emits the comment after retry', () => {
    const body = 'Ready for review.'
    const comment = Comment.make({
      id: 'comment-retry',
      authorId: 'maya',
      body,
      createdAt: '2026-10-24T15:00:00.000Z',
    })
    const error = 'The workspace is temporarily unavailable.'

    return story(
      CommentComposerLive,
      args,
      message(Message.UpdatedBody({ value: `  ${body}  ` })),
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
      Command.resolve(AddComment, Message.SucceededAddComment({ comment })),
      expectOutMessage(OutMessage.AddedComment({ comment })),
      model(model => {
        expect(model.body).toBe('')
        expect(model.postState).toEqual(PostState.Idle())
      }),
      Command.expectNone(),
    ).pipe(Effect.provide(WorkspaceRepositoryLayer))
  })
})
