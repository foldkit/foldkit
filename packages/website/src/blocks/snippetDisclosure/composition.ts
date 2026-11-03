import { SnippetDisclosureDefinition } from './definition'
import { MeasureSnippetHeight } from './mount'

export const SnippetDisclosureComposition =
  SnippetDisclosureDefinition.makeComposition({
    mounts: [MeasureSnippetHeight],
  })
