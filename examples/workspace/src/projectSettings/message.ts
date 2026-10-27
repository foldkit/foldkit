import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Project } from '../domain'

export const Message = defineMessageUnion({
  UpdatedProjectName: { value: Schema.String },
  UpdatedProjectDescription: { value: Schema.String },
  SubmittedProjectSettings: {},
  ClickedRetrySave: {},
  ClickedDiscardChanges: {},
  SucceededSaveProject: { project: Project },
  FailedSaveProject: { error: Schema.String },
})
