import { ApplicationComposition } from './composition'
import { ConnectionState } from './model'

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    connection: ConnectionState.Disconnected(),
    messages: [],
    messageInput: '',
  },
}))
