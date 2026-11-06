import { String } from 'effect'

import { type Project } from '../../domain'
import { type Model, ProjectDraft } from './model'

export const hasUnsavedChanges = (model: Model) =>
  String.trim(model.draft.name) !== model.savedProject.name ||
  model.draft.description !== model.savedProject.description

export const draftFromProject = (project: Project.Project) =>
  ProjectDraft.make({ name: project.name, description: project.description })
