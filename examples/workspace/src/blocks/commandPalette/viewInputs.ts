import { Schema } from 'effect'

import { Issue, Project } from '../../domain'

export const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue),
  projects: Schema.Array(Project),
})
export type ViewInputs = typeof ViewInputs.Type
