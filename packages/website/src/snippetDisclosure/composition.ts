import { SnippetDisclosure } from './definition'
import { MeasureSnippetHeight } from './mount'

export const SnippetDisclosureComposition = SnippetDisclosure.makeComposition({
  mounts: [MeasureSnippetHeight],
})
