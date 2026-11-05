import { Effect } from 'effect'

import { Message, makeCommand } from './block'

export const Read = makeCommand('Read', {
  messages: [Message.CompletedRead],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRead())
  },
})
