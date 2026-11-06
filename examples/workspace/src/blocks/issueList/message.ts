import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Issue } from '../../domain'
import { StatusFilterValue } from '../../listbox'

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  UpdatedStatusFilter: { value: StatusFilterValue },
  UpdatedSort: { value: Issue.SortBy },
  ClickedCreateIssue: {},
  ClickedClearFilters: {},
  UpdatedGrouping: { value: Issue.GroupBy },
  UpdatedSavedViewName: { value: Schema.String },
  SubmittedSavedView: { filters: Issue.Filters },
})
export type Message = typeof Message.Type
