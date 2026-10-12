import { HashMap, HashSet } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

export const update = Update.define((model: Model, message: Message) =>
  Message.match(message, {
    ToggledCodeDisclosure: ({ disclosureId, isOpen }) => ({
      model: modifyFields(model, {
        openDisclosureIds: isOpen
          ? HashSet.add(disclosureId)
          : HashSet.remove(disclosureId),
      }),
    }),
    CompletedMeasureSnippetHeight: ({ snippetId, snippetSize }) => ({
      model: modifyFields(model, {
        snippetSizes: HashMap.set(snippetId, snippetSize),
      }),
    }),
  }),
)
