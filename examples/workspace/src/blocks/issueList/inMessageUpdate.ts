import { IssueListComposition } from './composition'
import { clearFilters } from './steps'

export const inMessageUpdate = IssueListComposition.makeInMessageUpdate({
  RequestedClearFilters: clearFilters,
})
