import { modifyFields } from 'foldkit/struct'

import { BlockPageComposition } from './definition'
import { Message } from './message'

export const update = BlockPageComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ToggledMapMessagesUnderHood: ({ isOpen }) => ({
      model: modifyFields(model, { isMapMessagesUnderHoodOpen: () => isOpen }),
    }),
  }),
)
