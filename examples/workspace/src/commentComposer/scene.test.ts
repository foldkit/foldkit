import { Array, Effect, Option } from 'effect'
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
  withViewInputs,
} from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { describe, test } from 'vitest'

import { initialWorkspace } from '../domain'
import { layer } from './block'
import { AddComment } from './command'
import { CommentComposerBlock } from './definition'
import { Message } from './message'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const sceneView = (
  executable: Story.TestBlock<typeof CommentComposerBlock>,
) => {
  const view = executable.view
  return withViewInputs(view, {
    members: initialWorkspace.members,
    comments: issue.comments,
    authorId: 'maya',
  })
}

describe('Comment Composer view', () => {
  test('shows and discards a retained comment draft', () => {
    return Effect.runPromise(
      Story.withBlock(CommentComposerBlock, executable => {
        const init = executable.init
        const update = executable.update

        const body = 'Keep this comment available.'

        scene(
          { update, view: sceneView(executable)() },
          given(init(issue.id, body).model),
          expect(label('Write a comment')).toHaveValue(body),
          expect(text('Comment draft kept for this session')).toExist(),
          click(role('button', { name: 'Discard comment' })),
          expect(label('Write a comment')).toHaveValue(''),
          expect(role('button', { name: 'Discard comment' })).not.toExist(),
          expect(text('Comment draft kept for this session')).not.toExist(),
        )
      }).pipe(Effect.provide(layer)),
    )
  })

  test('keeps the comment available after failure and retries it', () => {
    return Effect.runPromise(
      Story.withBlock(CommentComposerBlock, executable => {
        const init = executable.init
        const update = executable.update

        const body = 'Please review this change.'

        scene(
          { update, view: sceneView(executable)() },
          given(init(issue.id).model),
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
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
