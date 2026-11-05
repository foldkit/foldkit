import { makeComposition } from './block'
import { MeasureSnippetHeight } from './mount'

export const SnippetDisclosureComposition = makeComposition({
  mounts: [MeasureSnippetHeight],
})
