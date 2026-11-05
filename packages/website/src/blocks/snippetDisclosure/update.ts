import { HashMap, HashSet } from 'effect'

import { makeFieldsStep } from './block'
import { SnippetDisclosureComposition } from './composition'

export const update = SnippetDisclosureComposition.makeUpdate({
  ToggledCodeDisclosure: makeFieldsStep.fromMessage(
    ({ disclosureId, isOpen }) => ({
      openDisclosureIds: isOpen
        ? HashSet.add(disclosureId)
        : HashSet.remove(disclosureId),
    }),
  ),
  CompletedMeasureSnippetHeight: makeFieldsStep.fromMessage(
    ({ snippetId, snippetSize }) => ({
      snippetSizes: HashMap.set(snippetId, snippetSize),
    }),
  ),
})
