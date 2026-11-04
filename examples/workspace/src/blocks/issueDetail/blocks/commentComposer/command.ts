import { Effect, Schema } from 'effect'

import { WorkspaceRepository } from '../../../../repository'
import { CommentComposerBlock } from './definition'
import { Message } from './message'

export const AddComment = CommentComposerBlock.makeCommand('AddComment', {
  args: {
    issueId: Schema.String,
    body: Schema.String,
    authorId: Schema.String,
  },
  messages: [Message.SucceededAddComment, Message.FailedAddComment],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.addComment(args).pipe(
        Effect.map(comment => Message.SucceededAddComment({ comment })),
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedAddComment({
              error: error.message,
            }),
          ),
        ),
      )
  },
})

export const EffectsLayer = AddComment.layer
