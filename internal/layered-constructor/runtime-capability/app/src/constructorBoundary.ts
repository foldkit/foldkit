import { Effect } from 'effect'

import { ChatSocket } from './chatRoom/chatSocket'
import { ChatRoomDefinition } from './chatRoom/definition'
import { Message } from './chatRoom/message'

const invalid = {
  messages: [Message.ConnectedChatSocket],
  handler: function* () {
    yield* ChatSocket.get

    return () => Effect.succeed(Message.ConnectedChatSocket())
  },
}

if (false) {
  // @ts-expect-error Placement resources remain unavailable during handler construction.
  ChatRoomDefinition.makeCommand('EagerResourceRead', invalid)
}
