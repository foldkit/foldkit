import { initAndInsert } from 'foldkit/bindingInit'

import { EditorsBinding } from './composition'
import { ApplicationDefinition } from './definition'
import { Issue } from './domain'

const initializeIssueEditor = (issue: typeof Issue.Type) =>
  ApplicationDefinition.makeStep(model =>
    initAndInsert(EditorsBinding, model, {
      key: issue.id,
      args: [issue],
    }),
  )
