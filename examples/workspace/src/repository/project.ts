import { Array, Result } from 'effect'

import { type Project, Workspace } from '../domain'
import { RepositoryError } from './schema'
import {
  type RepositoryState,
  type RepositoryTransition,
  hasProject,
} from './state'

export const saveProjectInState = (
  state: typeof RepositoryState.Type,
  project: typeof Project.Type,
): RepositoryTransition<typeof Project.Type> => {
  if (!hasProject(state, project.id)) {
    return [
      Result.fail(
        RepositoryError.InvalidProject({
          projectId: project.id,
          message: 'This project could not be found.',
        }),
      ),
      state,
    ]
  }

  const nextWorkspace = Workspace.make({
    ...state.workspace,
    projects: Array.map(state.workspace.projects, currentProject =>
      currentProject.id === project.id ? project : currentProject,
    ),
  })

  return [Result.succeed(project), { ...state, workspace: nextWorkspace }]
}
