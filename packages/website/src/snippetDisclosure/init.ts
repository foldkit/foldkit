import { HashMap, HashSet } from 'effect'

export const init = () => ({
  model: {
    openSnippetIds: HashSet.empty(),
    snippetSizes: HashMap.empty(),
  },
})
