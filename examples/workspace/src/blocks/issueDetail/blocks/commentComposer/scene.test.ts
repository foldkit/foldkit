import { Array, Option } from 'effect'
import { Scene } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { initialWorkspace } from '../../../../domain'
import { CommentComposerBlock } from './block'
import { AddComment } from './command'
import { layer } from './layer'
import { Message } from './message'

const issue = Option.getOrThrow(Array.head(initialWorkspace.issues))
const viewInputs = {
  members: initialWorkspace.members,
  comments: issue.comments,
  authorId: 'maya',
}

describe('Comment Composer view', () => {
  it.effect('shows and discards a retained comment draft', () => {
    const body = 'Keep this comment available.'
    return Scene.scene(
      { block: CommentComposerBlock, layer, viewInputs },
      Scene.init(issue.id, body),
      Scene.expect(Scene.label('Write a comment')).toHaveValue(body),
      Scene.expect(Scene.text('Comment draft kept for this session')).toExist(),
      Scene.click(Scene.role('button', { name: 'Discard comment' })),
      Scene.expect(Scene.label('Write a comment')).toHaveValue(''),
      Scene.expect(
        Scene.role('button', { name: 'Discard comment' }),
      ).not.toExist(),
      Scene.expect(
        Scene.text('Comment draft kept for this session'),
      ).not.toExist(),
    )
  })

  it.effect('keeps the comment available after failure and retries it', () => {
    const body = 'Please review this change.'
    return Scene.scene(
      { block: CommentComposerBlock, layer, viewInputs },
      Scene.init(issue.id),
      Scene.type(Scene.label('Write a comment'), body),
      Scene.click(Scene.role('button', { name: 'Post comment' })),
      Scene.expect(Scene.text('Posting comment…')).toExist(),
      Scene.expect(Scene.label('Write a comment')).toBeDisabled(),
      Scene.expect(
        Scene.role('button', { name: 'Discard comment' }),
      ).toBeDisabled(),
      Scene.expect(
        Scene.role('button', { name: 'Post comment' }),
      ).toBeDisabled(),
      Scene.Command.resolve(
        AddComment,
        Message.FailedAddComment({
          error: 'The workspace is temporarily unavailable.',
        }),
      ),
      Scene.expect(Scene.role('alert')).toContainText(
        'The workspace is temporarily unavailable.',
      ),
      Scene.expect(Scene.label('Write a comment')).toHaveValue(body),
      Scene.click(Scene.role('button', { name: 'Post comment' })),
      Scene.Command.expectExact(
        AddComment({ issueId: issue.id, body, authorId: 'maya' }),
      ),
      Scene.Command.resolve(
        AddComment,
        Message.FailedAddComment({
          error: 'The workspace is temporarily unavailable.',
        }),
      ),
    )
  })
})
