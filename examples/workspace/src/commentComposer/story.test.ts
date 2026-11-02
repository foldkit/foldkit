import { Array, Effect, Option } from 'effect'
import * as Story from 'foldkit/story'
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

import { Comment, initialWorkspace } from '../domain'
import { layer } from './block'
import { AddComment } from './command'
import { CommentComposerBlock } from './definition'
import { Message } from './message'
import { Model, PostState } from './model'
import { OutMessage } from './outMessage'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const existingComment = Option.getOrThrow(Array.head(issue.comments))

describe('CommentComposerBlock update', () => {
  test('keeps edits local and discards an idle draft', () => {
    return Effect.runPromise(
      Story.withBlock(CommentComposerBlock, executable => {
        const init = executable.init
        const update = executable.update

        const body = 'This draft changed.'

        story(
          update,
          given(init(issue.id).model),
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
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('keeps a posting draft locked', () => {
    return Effect.runPromise(
      Story.withBlock(CommentComposerBlock, executable => {
        const update = executable.update

        const body = 'The submitted comment.'
        const postingModel = Model.make({
          issueId: issue.id,
          body,
          postState: PostState.Posting(),
        })

        story(
          update,
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
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test.each([PostState.Idle(), PostState.Failed({ error: 'Try again.' })])(
    'ignores post completions while $_tag',
    postState => {
      return Effect.runPromise(
        Story.withBlock(CommentComposerBlock, executable => {
          const update = executable.update

          const currentModel = Model.make({
            issueId: issue.id,
            body: 'Keep this draft.',
            postState,
          })

          story(
            update,
            given(currentModel),
            message(Message.SucceededAddComment({ comment: existingComment })),
            expectNoOutMessage(),
            model(model => expect(model).toBe(currentModel)),
            message(Message.FailedAddComment({ error: 'A late failure.' })),
            expectNoOutMessage(),
            model(model => expect(model).toBe(currentModel)),
            Command.expectNone(),
          )
        }).pipe(Effect.provide(layer)),
      )
    },
  )

  test('retains a failed post and emits the comment after retry', () => {
    return Effect.runPromise(
      Story.withBlock(CommentComposerBlock, executable => {
        const init = executable.init
        const update = executable.update

        const body = 'Ready for review.'
        const comment = Comment.make({
          id: 'comment-retry',
          authorId: 'maya',
          body,
          createdAt: '2026-10-24T15:00:00.000Z',
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
          Command.resolve(AddComment, Message.SucceededAddComment({ comment })),
          expectOutMessage(OutMessage.AddedComment({ comment })),
          model(model => {
            expect(model.body).toBe('')
            expect(model.postState).toEqual(PostState.Idle())
          }),
          Command.expectNone(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
