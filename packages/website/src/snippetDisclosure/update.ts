import { HashMap, HashSet } from 'effect'

import { SnippetDisclosureComposition } from './composition'
import { SnippetDisclosureDefinition } from './definition'

export const update = SnippetDisclosureComposition.makeUpdate({
  ToggledCodeDisclosure: SnippetDisclosureDefinition.makeFieldsStep.fromMessage(
    ({ disclosureId, isOpen }) => ({
      openDisclosureIds: isOpen
        ? HashSet.add(disclosureId)
        : HashSet.remove(disclosureId),
    }),
  ),
  CompletedMeasureSnippetHeight:
    SnippetDisclosureDefinition.makeFieldsStep.fromMessage(
      ({ snippetId, snippetSize }) => ({
        snippetSizes: HashMap.set(snippetId, snippetSize),
      }),
    ),
})
