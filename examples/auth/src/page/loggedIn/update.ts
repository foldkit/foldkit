import { LoggedInComposition } from './definition'
import { Message, OutMessage } from './message'

export const update = LoggedInComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedLogout: () => ({
      model,
      outMessage: OutMessage.RequestedLogout(),
    }),
  }),
)
