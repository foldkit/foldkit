import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { GroupBy, IssueFilters, IssueStatus } from '../domain'
import { StatusFilterValue } from '../listbox'

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  UpdatedStatusFilter: { value: StatusFilterValue },
  UpdatedSort: { value: IssueFilters.fields.sort },
  ClickedCreateIssue: {},
  RequestedClearFilters: {},
  UpdatedGrouping: { value: GroupBy },
  UpdatedSavedViewName: { value: Schema.String },
  SubmittedSavedView: { filters: IssueFilters },
})

export const OutMessage = defineMessageUnion({
  ChangedQuery: { query: Schema.String },
  ChangedStatusFilter: { maybeStatus: Schema.Option(IssueStatus) },
  ChangedSort: { sort: IssueFilters.fields.sort },
  ChangedGrouping: { groupBy: GroupBy },
  RequestedClearFilters: {},
  RequestedCreation: {},
  SavedFilter: { name: Schema.String, filters: IssueFilters },
})
