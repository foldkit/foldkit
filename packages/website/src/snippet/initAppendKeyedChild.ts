import { Array } from 'effect'
import { initAndAppend } from 'foldkit/bindingInit'

import { ProjectSettingsBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { Project } from './domain'

const initializeProjectSettingsIfMissing = (project: typeof Project.Type) =>
  ApplicationDefinition.makeStep(model => {
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
