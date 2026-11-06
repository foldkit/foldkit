import { Option, Result } from 'effect'

import { type Project, Workspace } from '../domain'
import { RepositoryError } from './schema'
import { type RepositoryState, type RepositoryTransition } from './state'

export const saveProjectInState = (
  state: RepositoryState,
  project: Project.Project,
): RepositoryTransition<Project.Project> => {
  if (Option.isNone(Workspace.findProject(state.workspace, project.id))) {
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

  const nextWorkspace = Workspace.replaceProject(state.workspace, project)

  return [Result.succeed(project), { ...state, workspace: nextWorkspace }]
}
