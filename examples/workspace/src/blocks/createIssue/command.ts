import { Effect } from 'effect'

import { Issue } from '../../domain'
import { WorkspaceRepository } from '../../repository'
import { makeCommand } from './block'
import { Message } from './message'

export const CreateIssue = makeCommand('CreateIssue', {
  args: { draft: Issue.Draft },
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
