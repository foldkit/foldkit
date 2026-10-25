import { Schema } from 'effect'

import { Issue, IssueFilters, Member, Project } from '../domain'
import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
} from '../listbox'

export const Model = Schema.Struct({
  savedViewName: Schema.String,
  statusListbox: StatusFilterListboxBlock.Model,
  sortListbox: SortListboxBlock.Model,
  groupListbox: GroupListboxBlock.Model,
})

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue),
  members: Schema.Array(Member),
  projects: Schema.Array(Project),
  maybeActiveIssueId: Schema.Option(Schema.String),
  filters: IssueFilters,
  issueHrefs: Schema.Record(Schema.String, Schema.String),
})
