import { Effect } from 'effect'

import { IssueDraft } from '../domain'
import { WorkspaceRepository } from '../repository'
import { CreateIssueDefinition, Message } from './definition'

export const CreateIssue = CreateIssueDefinition.makeCommand('CreateIssue', {
  args: { draft: IssueDraft },
  messages: [Message.SucceededCreateIssue, Message.FailedCreateIssue],
  handler: function* () {
    const repository = yield* WorkspaceRepository

    return ({ draft }) =>
      repository.createIssue(draft).pipe(
        Effect.map(issue => Message.SucceededCreateIssue({ issue })),
        Effect.catch(error =>
          Effect.succeed(Message.FailedCreateIssue({ error: error.message })),
        ),
      )
  },
})
