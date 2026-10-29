import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { GroupBy, IssueFilters } from '../domain'
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
export type Message = typeof Message.Type
