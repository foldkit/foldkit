import { Effect, Schema } from 'effect'

import { WorkspaceRepository } from '../repository'
import { CommentComposerDefinition, Message } from './definition'

export const AddComment = CommentComposerDefinition.makeCommand('AddComment', {
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
        Effect.map(issue => Message.SucceededAddComment({ issue })),
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
