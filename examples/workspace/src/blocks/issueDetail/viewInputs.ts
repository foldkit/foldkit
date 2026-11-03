import { Schema } from 'effect'

import { Issue, Member, Project } from '../../domain'

export const ViewInputs = Schema.Struct({
  issue: Issue,
  members: Schema.Array(Member),
  projects: Schema.Array(Project),
  authorId: Schema.String,
})
export type ViewInputs = typeof ViewInputs.Type
