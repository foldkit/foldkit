import { Effect, Schema } from 'effect'

import { Issue } from '../../domain'
import { WorkspaceRepository } from '../../repository'
import { makeCommand } from './block'
import { Message } from './message'

export const SaveIssue = makeCommand('SaveIssue', {
  args: {
    issueId: Schema.String,
    draft: Issue.Draft,
    expectedVersion: Schema.Number,
  },
  messages: [Message.SucceededSaveIssue, Message.FailedSaveIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.saveIssue(args).pipe(
        Effect.map(saveResult =>
          Message.SucceededSaveIssue({
            saveResult,
            expectedVersion: args.expectedVersion,
          }),
        ),
        Effect.catch(error =>
          Effect.succeed(
            Message.FailedSaveIssue({
              issueId: args.issueId,
              expectedVersion: args.expectedVersion,
              error,
            }),
          ),
        ),
      )
  },
})
