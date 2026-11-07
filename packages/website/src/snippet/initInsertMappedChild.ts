import { initAndInsert } from 'foldkit/binding'

import { makeStep } from './block'
import { EditorsBinding } from './composition'
import { Issue } from './domain'

const initIssueEditor = (issue: Issue) =>
  makeStep(model =>
    initAndInsert(EditorsBinding, model, {
      key: issue.id,
      args: [issue],
    }),
  )
