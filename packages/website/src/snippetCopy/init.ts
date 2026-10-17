import { HashSet } from 'effect'

import { SnippetCopyComposition } from './definition'

export const init = SnippetCopyComposition.makeInit(() => ({
  model: {
    copiedSnippetIds: HashSet.empty(),
  },
}))
