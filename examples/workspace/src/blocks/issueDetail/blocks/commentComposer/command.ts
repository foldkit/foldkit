import { Effect, Schema } from 'effect'

import { WorkspaceRepository } from '../../../../repository'
import { makeCommand } from './block'
import { Message } from './message'

export const AddComment = makeCommand('AddComment', {
  args: {
    issueId: Schema.String,
    body: Schema.String,
    authorId: Schema.String,
  },
  messages: [Message.SucceededAddComment, Message.FailedAddComment],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.addIssueComment(args).pipe(
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
