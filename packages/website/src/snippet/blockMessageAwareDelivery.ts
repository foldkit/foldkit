import { modifyFields } from 'foldkit/struct'

import { Read } from './command'
import { ReaderComposition } from './composition'

export const update = ReaderComposition.makeUpdate.withContext(
  (isInteractionAllowed: boolean) => ({
    ClickedReload: model =>
      isInteractionAllowed ? { model, commands: [Read()] } : { model },
    CompletedRead: (model, { content }) => ({
      model: modifyFields(model, { content: () => content }),
    }),
  }),
)
