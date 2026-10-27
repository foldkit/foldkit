import { initAndInsert } from 'foldkit/bindingInit'

import { EditorsBinding } from './composition'
import { makeStep } from './definition'
import { Issue } from './domain'

const initIssueEditorStep = (issue: typeof Issue.Type) =>
  makeStep(model =>
    initAndInsert(EditorsBinding, model, {
      key: issue.id,
      args: [issue],
    }),
  )
