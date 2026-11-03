import { ChatRoomComposition } from './composition'
import { ConnectionState } from './model'

export const init = ChatRoomComposition.makeInit(({ title, inputId }) => ({
  model: {
    title,
    connection: ConnectionState.Disconnected(),
    messages: [],
    nextMessageId: 0,
  },
  childInitContext: { inputId },
}))
