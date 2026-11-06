import { Schema } from 'effect'

import { Issue, Member, Project } from '../../domain'

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue.Issue),
  members: Schema.Array(Member.Member),
  projects: Schema.Array(Project.Project),
  maybeActiveIssueId: Schema.Option(Schema.String),
  filters: Issue.Filters,
  issueHrefsById: Schema.Record(Schema.String, Schema.String),
})
export type ViewInputs = typeof ViewInputs.Type
