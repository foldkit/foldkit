import { Option } from 'effect'
import { Command, given, message, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { WorkspaceAgentContext } from './agentContext'

test('an agent turn carries the open thread and the selection', () => {
  story(
    update,
    given(threadModel),
    message(Message.SubmittedAgentPrompt({ prompt: 'Summarize these' })),
    Command.expectHas(
      SendAgentTurn({
        prompt: 'Summarize these',
        context: {
          page: 'Thread',
          maybeOpenThreadId: Option.some('thread-7'),
          selectedThreadIds: ['thread-7', 'thread-9'],
          filter: 'Unread',
        },
      }),
    ),
    Command.resolve(
      SendAgentTurn,
      Message.SucceededSendAgentTurn({ reply: 'Two threads about Q3.' }),
    ),
  )
})

test('the agent context leaves out the draft and the session token', () => {
  const encoded = WorkspaceAgentContext.encode(
    WorkspaceAgentContext.read(threadModel),
  )

  expect(encoded).not.toHaveProperty('draftBody')
  expect(encoded).not.toHaveProperty('sessionToken')
})
