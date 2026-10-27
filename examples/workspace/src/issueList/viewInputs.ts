import { Schema } from 'effect'

import { Issue, IssueFilters, Member, Project } from '../domain'

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue),
  members: Schema.Array(Member),
  projects: Schema.Array(Project),
  maybeActiveIssueId: Schema.Option(Schema.String),
  filters: IssueFilters,
  issueHrefs: Schema.Record(Schema.String, Schema.String),
})
