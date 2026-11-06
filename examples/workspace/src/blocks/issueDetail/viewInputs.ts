import { Schema } from 'effect'

import { Issue, Member, Project } from '../../domain'

export const ViewInputs = Schema.Struct({
  issue: Issue.Issue,
  members: Schema.Array(Member.Member),
  projects: Schema.Array(Project.Project),
  commentAuthorId: Schema.String,
})
export type ViewInputs = typeof ViewInputs.Type
