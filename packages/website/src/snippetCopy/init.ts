import { HashSet } from 'effect'

export const init = () => ({
  model: {
    copiedSnippetIds: HashSet.empty(),
  },
})
