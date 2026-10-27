import { Effect } from 'effect'

import { Project } from '../domain'
import { WorkspaceRepository } from '../repository'
import { ProjectSettingsDefinition } from './definition'
import { Message } from './message'

export const SaveProject = ProjectSettingsDefinition.makeCommand(
  'SaveProject',
  {
    args: { project: Project },
    messages: [Message.SucceededSaveProject, Message.FailedSaveProject],
    handler: function* () {
      const repository = yield* WorkspaceRepository

      return ({ project }) =>
        repository.saveProject(project).pipe(
          Effect.map(project => Message.SucceededSaveProject({ project })),
          Effect.catch(error =>
            Effect.succeed(Message.FailedSaveProject({ error: error.message })),
          ),
        )
    },
  },
)
