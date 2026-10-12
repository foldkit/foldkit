import { HashMap, HashSet } from 'effect'

export const init = () => ({
  model: {
    openDisclosureIds: HashSet.empty(),
    snippetSizes: HashMap.empty(),
  },
})
