import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Project } from '../domain'

export const ProjectDraft = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
})
export type ProjectDraft = typeof ProjectDraft.Type

export const SaveState = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Saved: {},
  Failed: { error: Schema.String },
})
export type SaveState = typeof SaveState.Type

export const Model = Schema.Struct({
  baseline: Project,
  draft: ProjectDraft,
  saveState: SaveState,
})
export type Model = typeof Model.Type
