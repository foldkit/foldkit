import { Update } from 'foldkit'

import { makeFieldsStep } from './block'
import { CreateIssueComposition, DialogBinding } from './composition'
import { CreateState } from './model'

export const inMessageUpdate = CreateIssueComposition.makeInMessageUpdate({
  RequestedOpen: (model, { projectId, status = 'Todo' }) => {
    if (CreateState.guards.Creating(model.createState)) {
      return DialogBinding.requestOpen()(model)
    }

    return Update.combineSteps(model, [
      makeFieldsStep(() => ({
        title: () => '',
        description: () => '',
        projectId: () => projectId,
        status: () => status,
        priority: () => 'Medium',
        createState: () => CreateState.Idle(),
      })),
      DialogBinding.requestOpen(),
    ])
  },
  RequestedClose: DialogBinding.requestClose(),
})
