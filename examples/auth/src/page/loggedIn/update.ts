import { Update } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedLogout: () => ({
      model,
      outMessage: OutMessage.RequestedLogout(),
    }),
  }),
)
