import { HashMap, HashSet } from 'effect'
import { type Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { type Model } from './model'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
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
  })
