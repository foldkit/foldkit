import type { Project } from '../domain'
import { ProjectSettingsComposition } from './composition'
import { SaveState } from './model'

export const init = ProjectSettingsComposition.makeInit(
  (project: typeof Project.Type) => ({
    model: {
      baseline: project,
      draft: { name: project.name, description: project.description },
      saveState: SaveState.Idle(),
    },
  }),
)
