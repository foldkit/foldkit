import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'

export const OutMessage = defineMessageUnion({
  ChangedQuery: { query: Schema.String },
  ChangedStatusFilter: { maybeStatus: Schema.Option(Issue.Status) },
  ChangedSort: { sort: Issue.SortBy },
  ChangedGrouping: { groupBy: Issue.GroupBy },
  RequestedClearFilters: {},
  RequestedCreation: {},
  SubmittedSavedView: { name: Schema.String, filters: Issue.Filters },
})
export type OutMessage = typeof OutMessage.Type
