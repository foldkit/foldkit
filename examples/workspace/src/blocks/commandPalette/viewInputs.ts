import { Schema } from 'effect'

import { Issue, Project } from '../../domain'

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue.Issue),
  projects: Schema.Array(Project.Project),
})
export type ViewInputs = typeof ViewInputs.Type
