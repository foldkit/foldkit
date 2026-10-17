import { Array, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { AttachmentsComposition } from './composition'
import { Message } from './definition'

export const update = AttachmentsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    RemovedResume: () => ({
      model: modifyFields(model, { maybeResume: () => Option.none() }),
    }),

    RemovedAdditionalFile: ({ fileIndex }) => ({
      model: modifyFields(model, {
        additionalFiles: Array.remove(fileIndex),
      }),
    }),
  }),
)
