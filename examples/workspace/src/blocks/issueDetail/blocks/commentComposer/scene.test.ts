import { Array, Option } from 'effect'
import {
  Command,
  click,
  expect,
  init,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
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
    return scene(
      { block: CommentComposerBlock, layer, viewInputs },
      init(issue.id, body),
      expect(label('Write a comment')).toHaveValue(body),
      expect(text('Comment draft kept for this session')).toExist(),
      click(role('button', { name: 'Discard comment' })),
      expect(label('Write a comment')).toHaveValue(''),
      expect(role('button', { name: 'Discard comment' })).not.toExist(),
      expect(text('Comment draft kept for this session')).not.toExist(),
    )
  })

  it.effect('keeps the comment available after failure and retries it', () => {
    const body = 'Please review this change.'
    return scene(
      { block: CommentComposerBlock, layer, viewInputs },
      init(issue.id),
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
  })
})
