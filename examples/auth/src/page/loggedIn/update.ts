import { type Update } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      ClickedLogout: () => ({
        model,
        outMessage: OutMessage.RequestedLogout(),
      }),
    },
  )
