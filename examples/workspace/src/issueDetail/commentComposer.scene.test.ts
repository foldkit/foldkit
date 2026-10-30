import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { initialWorkspace } from '../domain/seed'
import { ApplicationLayer } from '../services'
import {
  AddComment,
  CommentComposer,
  CommentComposerLive,
  Message,
  OutMessage,
  PostState,
} from './commentComposer'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))

class CommentComposerScene extends Block<CommentComposerScene>()(
  'CommentComposerScene',
  {
    Model: Schema.Struct({ commentComposer: CommentComposer }),
    OutMessage,
  },
) {}

const CommentComposerSceneLive = CommentComposerScene.make(
  Effect.fn(function* () {
    const commentComposer = yield* new CommentComposer('commentComposer', {
      issueId: issue.id,
    })

    return {
      model: { commentComposer },
      update: {
        ...commentComposer.on({
          AddedComment: (model, outMessage) => ({ model, outMessage }),
        }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            model.commentComposer.view({
              members: initialWorkspace.members,
              comments: issue.comments,
              authorId: 'maya',
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(CommentComposerLive))

describe('Comment Composer view', () => {
  it.effect('shows and discards a retained comment draft', () => {
    const body = 'Keep this comment available.'

    return scene(
      CommentComposerSceneLive,
      given({
        commentComposer: {
          issueId: issue.id,
          body,
          postState: PostState.Idle(),
        },
      }),
      expect(label('Write a comment')).toHaveValue(body),
      expect(text('Comment draft kept for this session')).toExist(),
      click(role('button', { name: 'Discard comment' })),
      expect(label('Write a comment')).toHaveValue(''),
      expect(role('button', { name: 'Discard comment' })).not.toExist(),
      expect(text('Comment draft kept for this session')).not.toExist(),
    ).pipe(Effect.provide(ApplicationLayer))
  })

  it.effect('keeps the comment available after failure and retries it', () => {
    const body = 'Please review this change.'

    return scene(
      CommentComposerSceneLive,
      type(label('Write a comment'), body),
      click(role('button', { name: 'Post comment' })),
      expect(text('Posting comment…')).toExist(),
      expect(label('Write a comment')).toBeDisabled(),
      expect(role('button', { name: 'Discard comment' })).toBeDisabled(),
      expect(role('button', { name: 'Post comment' })).toBeDisabled(),
      Command.resolve(
        AddComment,
        Message.FailedAddComment({
          error: 'The workspace is temporarily unavailable.',
        }),
      ),
      expect(role('alert')).toContainText(
        'The workspace is temporarily unavailable.',
      ),
      expect(label('Write a comment')).toHaveValue(body),
      click(role('button', { name: 'Post comment' })),
      Command.expectExact(
        AddComment({ issueId: issue.id, body, authorId: 'maya' }),
      ),
      Command.resolve(
        AddComment,
        Message.FailedAddComment({
          error: 'The workspace is temporarily unavailable.',
        }),
      ),
    ).pipe(Effect.provide(ApplicationLayer))
  })
})
