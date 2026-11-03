import { Update } from 'foldkit'

import { CreateIssueComposition, DialogBinding } from './composition'
import { makeFieldsStep } from './definition'
import { CreateState } from './model'

export const receive = CreateIssueComposition.makeReceive({
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
