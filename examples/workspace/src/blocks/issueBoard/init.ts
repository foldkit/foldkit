import { IssueBoardComposition } from './composition'

export const init = IssueBoardComposition.makeInit(() => ({
  model: { announcement: '' },
}))
