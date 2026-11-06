import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { Issue, initialWorkspace } from '../../../../domain'
import { CommentComposerBlock } from './block'
import { AddComment } from './command'
import { layer } from './layer'
import { Message } from './message'
import { Model, PostState } from './model'
import { OutMessage } from './outMessage'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const existingComment = Option.getOrThrow(Array.head(issue.comments))

describe('CommentComposerBlock update', () => {
  it.effect('keeps edits local and discards an idle draft', () => {
    const body = 'This draft changed.'
    return Story.story(
      { block: CommentComposerBlock, layer },
      Story.init(issue.id),
      Story.message(Message.UpdatedBody({ value: body })),
      Story.expectNoOutMessage(),
      Story.model(model => expect(model.body).toBe(body)),
      Story.message(Message.ClickedDiscardComment()),
      Story.expectNoOutMessage(),
      Story.model(model => {
        expect(model.body).toBe('')
        expect(model.postState).toEqual(PostState.Idle())
      }),
      Story.Command.expectNone(),
    )
  })

  it.effect('keeps a posting draft locked', () => {
    const body = 'The submitted comment.'

    const postingModel = Model.make({
      issueId: issue.id,
      body,
      postState: PostState.Posting(),
    })
    return Story.story(
      { block: CommentComposerBlock, layer },
      Story.given(postingModel),
      Story.message(Message.UpdatedBody({ value: 'An edit during posting.' })),
      Story.expectNoOutMessage(),
      Story.model(model => expect(model).toBe(postingModel)),
      Story.message(Message.ClickedDiscardComment()),
      Story.expectNoOutMessage(),
      Story.model(model => expect(model).toBe(postingModel)),
      Story.message(Message.SubmittedCommentForm({ authorId: 'alex' })),
      Story.expectNoOutMessage(),
      Story.model(model => expect(model).toBe(postingModel)),
      Story.Command.expectNone(),
    )
  })

  it.effect.each([PostState.Idle(), PostState.Failed({ error: 'Try again.' })])(
    'ignores post completions while $_tag',
    postState => {
      const currentModel = Model.make({
        issueId: issue.id,
        body: 'Keep this draft.',
        postState,
      })
      return Story.story(
        { block: CommentComposerBlock, layer },
        Story.given(currentModel),
        Story.message(
          Message.SucceededAddComment({ comment: existingComment }),
        ),
        Story.expectNoOutMessage(),
        Story.model(model => expect(model).toBe(currentModel)),
        Story.message(Message.FailedAddComment({ error: 'A late failure.' })),
        Story.expectNoOutMessage(),
        Story.model(model => expect(model).toBe(currentModel)),
        Story.Command.expectNone(),
      )
    },
  )

  it.effect('retains a failed post and emits the comment after retry', () => {
    const body = 'Ready for review.'

    const comment = Issue.Comment.make({
      id: 'comment-retry',
      authorId: 'maya',
      body,
      createdAt: '2026-10-24T15:00:00.000Z',
    })

    const error = 'The workspace is temporarily unavailable.'
    return Story.story(
      { block: CommentComposerBlock, layer },
      Story.init(issue.id, `  ${body}  `),
      Story.message(Message.SubmittedCommentForm({ authorId: 'maya' })),
      Story.Command.expectExact(
        AddComment({ issueId: issue.id, body, authorId: 'maya' }),
      ),
      Story.Command.resolve(AddComment, Message.FailedAddComment({ error })),
      Story.expectNoOutMessage(),
      Story.model(model => {
        expect(model.body).toBe(`  ${body}  `)
        expect(model.postState).toEqual(PostState.Failed({ error }))
      }),
      Story.message(Message.SubmittedCommentForm({ authorId: 'maya' })),
      Story.Command.expectExact(
        AddComment({ issueId: issue.id, body, authorId: 'maya' }),
      ),
      Story.Command.resolve(
        AddComment,
        Message.SucceededAddComment({ comment }),
      ),
      Story.expectOutMessage(OutMessage.AddedComment({ comment })),
      Story.model(model => {
        expect(model.body).toBe('')
        expect(model.postState).toEqual(PostState.Idle())
      }),
      Story.Command.expectNone(),
    )
  })
})
