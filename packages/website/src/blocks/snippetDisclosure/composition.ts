import { SnippetDisclosureBlock } from './definition'
import { MeasureSnippetHeight } from './mount'

export const SnippetDisclosureComposition =
  SnippetDisclosureBlock.makeComposition({
    mounts: [MeasureSnippetHeight],
  })
