import { type Project } from '../../domain'
import { ProjectSettingsComposition } from './composition'
import { draftFromProject } from './draft'
import { SaveState } from './model'

export const init = ProjectSettingsComposition.makeInit(
  (project: Project.Project) => ({
    model: {
      savedProject: project,
      draft: draftFromProject(project),
      saveState: SaveState.Idle(),
    },
  }),
)
