import { HashMap, HashSet } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { SnippetDisclosureComposition } from './composition'
import { Message } from './message'

export const update = SnippetDisclosureComposition.makeUpdate(
  (model, message) =>
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
