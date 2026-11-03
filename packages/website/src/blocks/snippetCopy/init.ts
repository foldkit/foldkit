import { HashSet } from 'effect'

import { SnippetCopyComposition } from './composition'

export const init = SnippetCopyComposition.makeInit(() => ({
  model: {
    copiedSnippetIds: HashSet.empty(),
  },
}))
