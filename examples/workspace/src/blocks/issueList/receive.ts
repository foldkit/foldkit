import { IssueListComposition } from './composition'
import { clearFilters } from './steps'

export const receive = IssueListComposition.makeReceive({
  RequestedClearFilters: clearFilters,
})
