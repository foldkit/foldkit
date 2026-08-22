import { type Update } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLogout: () => ({ model, outMessage: OutMessage.RequestedLogout() }),
  })
