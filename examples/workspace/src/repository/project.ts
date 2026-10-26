import { Array, Result } from 'effect'

import { type Project, WorkspaceSnapshot } from '../domain'
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

  const snapshot = WorkspaceSnapshot.make({
    ...state.snapshot,
    projects: Array.map(state.snapshot.projects, candidate =>
      candidate.id === project.id ? project : candidate,
    ),
  })

  return [Result.succeed(project), { ...state, snapshot }]
}
