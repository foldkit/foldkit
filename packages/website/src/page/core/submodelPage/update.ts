import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

export const update = Update.define((model: Model, message: Message) =>
  Message.match(message, {
    ToggledMapMessagesUnderHood: ({ isOpen }) => ({
      model: modifyFields(model, { isMapMessagesUnderHoodOpen: () => isOpen }),
    }),
  }),
)
