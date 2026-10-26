import { Effect, Schema } from 'effect'

import { IssueDraft } from '../domain'
import { WorkspaceRepository } from '../repository'
import { IssueDetailDefinition, Message } from './definition'

export const SaveIssue = IssueDetailDefinition.makeCommand('SaveIssue', {
  args: {
    issueId: Schema.String,
    draft: IssueDraft,
    expectedVersion: Schema.Number,
  },
  messages: [Message.SucceededSaveIssue, Message.FailedSaveIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return args =>
      repository.saveIssue(args).pipe(
        Effect.map(issue =>
          Message.SucceededSaveIssue({
            issue,
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

export const EffectsLayer = SaveIssue.layer
