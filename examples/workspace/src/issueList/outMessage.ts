import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { GroupBy, IssueFilters, IssueStatus } from '../domain'

export const OutMessage = defineMessageUnion({
  ChangedQuery: { query: Schema.String },
  ChangedStatusFilter: { maybeStatus: Schema.Option(IssueStatus) },
  ChangedSort: { sort: IssueFilters.fields.sort },
  ChangedGrouping: { groupBy: GroupBy },
  RequestedClearFilters: {},
  RequestedCreation: {},
  SavedFilter: { name: Schema.String, filters: IssueFilters },
})
