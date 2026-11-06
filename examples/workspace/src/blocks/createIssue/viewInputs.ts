import { Schema } from 'effect'

import { Project } from '../../domain'

export const ViewInputs = Schema.Struct({
  projects: Schema.Array(Project.Project),
})
export type ViewInputs = typeof ViewInputs.Type
