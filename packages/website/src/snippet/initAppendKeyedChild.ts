import { Array } from 'effect'
import { initAndAppend } from 'foldkit/bindingInit'

import { ProjectSettingsBinding } from './composition'
import { makeStep } from './definition'
import { Project } from './domain'

const initProjectSettingsIfMissingStep = (project: typeof Project.Type) =>
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
