import { Array } from 'effect'
import { initAndAppend } from 'foldkit/binding'

import { makeStep } from './block'
import { ProjectSettingsBinding } from './composition'
import { Project } from './domain'

const initProjectSettingsIfMissing = (project: Project) =>
  makeStep(model => {
    if (
      Array.some(
        model.projectSettingsInstances,
        instance => instance.projectId === project.id,
      )
    ) {
      return { model }
    }

    return initAndAppend(ProjectSettingsBinding, model, {
      key: project.id,
      args: [project],
    })
  })
