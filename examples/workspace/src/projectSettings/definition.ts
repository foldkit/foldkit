import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { Project } from '../domain'

export const ProjectDraft = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
})

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Saved: {},
  Failed: { error: Schema.String },
})

export const Model = Schema.Struct({
  baseline: Project,
  draft: ProjectDraft,
  saveState: SaveState,
})

export const Message = defineMessageUnion({
  UpdatedProjectName: { value: Schema.String },
  UpdatedProjectDescription: { value: Schema.String },
  SubmittedProjectSettings: {},
  ClickedRetrySave: {},
  ClickedDiscardChanges: {},
  SucceededSaveProject: { project: Project },
  FailedSaveProject: { error: Schema.String },
})

export const OutMessage = defineMessageUnion({
  Saved: { project: Project },
})

export const ProjectSettingsDefinition = Block.makeDefinition(
  'ProjectSettings',
  {
    Model,
    Message,
    OutMessage,
  },
)

export const { makeStep } = ProjectSettingsDefinition
