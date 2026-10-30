import { initAndInsert } from 'foldkit/bindingInit'

import { EditorsBinding } from './composition'
import { makeStep } from './definition'
import { Issue } from './domain'

const initIssueEditor = (issue: Issue) =>
  makeStep(model =>
    initAndInsert(EditorsBinding, model, {
      key: issue.id,
      args: [issue],
    }),
  )
