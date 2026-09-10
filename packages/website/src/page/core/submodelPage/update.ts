import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ToggledMapMessagesUnderHood: ({ isOpen }) => ({
      model: evo(model, { isMapMessagesUnderHoodOpen: () => isOpen }),
    }),
  })
