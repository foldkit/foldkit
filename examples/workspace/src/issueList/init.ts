import { IssueListComposition } from './composition'

export const init = IssueListComposition.makeInit(() => ({
  model: {
    savedViewName: '',
  },
}))
